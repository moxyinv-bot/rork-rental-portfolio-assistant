import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReminderRow = {
  id: string;
  title: string;
  due_date: string;
  notes: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  completed: boolean;
};

type ExistingDeliveryRow = {
  reminder_id: string;
  channel: "sms" | "email";
  recipient: string;
};

const corsHeaders = {
  "Content-Type": "application/json",
};

const parseReminderDate = (value: string): Date => {
  if (!value) return new Date(NaN);

  const normalized = value.replace(/\//g, "-");
  const parts = normalized.split("-");

  if (parts.length === 3) {
    const [a, b, c] = parts;
    const n1 = parseInt(a, 10);
    const n2 = parseInt(b, 10);
    const n3 = parseInt(c, 10);

    if (!Number.isNaN(n1) && !Number.isNaN(n2) && !Number.isNaN(n3)) {
      if (a.length <= 2) {
        const year = c.length === 2 ? n3 + 2000 : n3;
        return new Date(Date.UTC(year, n1 - 1, n2));
      }

      if (a.length === 4) {
        return new Date(Date.UTC(n1, n2 - 1, n3));
      }
    }
  }

  return new Date(value);
};

const toUtcDateOnly = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

const buildMessage = (reminder: ReminderRow): string => {
  const base = `Reminder: ${reminder.title}`;
  if (reminder.notes) {
    return `${base}\n\n${reminder.notes}`;
  }
  return base;
};

const sendSms = async (to: string, body: string): Promise<{ ok: boolean; providerMessageId?: string; error?: string }> => {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!sid || !token || !from) {
    return { ok: false, error: "Twilio credentials are not configured" };
  }

  const auth = btoa(`${sid}:${token}`);
  const form = new URLSearchParams({
    To: to,
    From: from,
    Body: body,
  });

  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const data = await resp.json();
  if (!resp.ok) {
    return { ok: false, error: data?.message ?? "Twilio send failed" };
  }

  return { ok: true, providerMessageId: data?.sid };
};

const sendEmail = async (to: string, subject: string, text: string): Promise<{ ok: boolean; providerMessageId?: string; error?: string }> => {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("REMINDER_FROM_EMAIL");

  if (!apiKey || !from) {
    return { ok: false, error: "Email provider credentials are not configured" };
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    return { ok: false, error: data?.message ?? "Email send failed" };
  }

  return { ok: true, providerMessageId: data?.id };
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const cronSecret = Deno.env.get("REMINDER_CRON_SECRET");
    if (!cronSecret) {
      return new Response(JSON.stringify({ error: "Reminder scheduler is not configured" }), {
        status: 503,
        headers: corsHeaders,
      });
    }

    if (req.headers.get("x-reminder-cron-secret") !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun ?? true;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const todayIso = toUtcDateOnly(new Date());

    const { data: reminders, error: remindersError } = await admin
      .from("reminders")
      .select("id, title, due_date, notes, recipient_phone, recipient_email, completed")
      .eq("completed", false);

    if (remindersError) {
      return new Response(JSON.stringify({ error: remindersError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dueToday = (reminders ?? []).filter((reminder: ReminderRow) => {
      const parsed = parseReminderDate(reminder.due_date);
      if (Number.isNaN(parsed.getTime())) return false;
      return toUtcDateOnly(parsed) === todayIso;
    });

    if (dueToday.length === 0) {
      return new Response(JSON.stringify({ ok: true, dryRun, message: "No reminders due today", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reminderIds = dueToday.map(r => r.id);
    const { data: existing, error: existingError } = await admin
      .from("reminder_deliveries")
      .select("reminder_id, channel, recipient")
      .in("reminder_id", reminderIds)
      .eq("scheduled_for", todayIso);

    if (existingError) {
      return new Response(JSON.stringify({ error: existingError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingSet = new Set(
      (existing as ExistingDeliveryRow[] | null)?.map(d => `${d.reminder_id}:${d.channel}:${d.recipient}`) ?? []
    );

    const deliveries: Array<Record<string, unknown>> = [];
    const results: Array<Record<string, unknown>> = [];

    for (const reminder of dueToday) {
      const message = buildMessage(reminder);
      const subject = `Property Reminder: ${reminder.title}`;

      if (reminder.recipient_phone) {
        const dedupeKey = `${reminder.id}:sms:${reminder.recipient_phone}`;
        if (!existingSet.has(dedupeKey)) {
          if (dryRun) {
            results.push({ reminderId: reminder.id, channel: "sms", recipient: reminder.recipient_phone, status: "queued" });
          } else {
            const send = await sendSms(reminder.recipient_phone, message);
            deliveries.push({
              reminder_id: reminder.id,
              household_id: null,
              channel: "sms",
              recipient: reminder.recipient_phone,
              scheduled_for: todayIso,
              status: send.ok ? "sent" : "failed",
              provider_message_id: send.providerMessageId ?? null,
              error_message: send.error ?? null,
            });
            results.push({ reminderId: reminder.id, channel: "sms", recipient: reminder.recipient_phone, status: send.ok ? "sent" : "failed", error: send.error ?? null });
          }
        }
      }

      if (reminder.recipient_email) {
        const dedupeKey = `${reminder.id}:email:${reminder.recipient_email}`;
        if (!existingSet.has(dedupeKey)) {
          if (dryRun) {
            results.push({ reminderId: reminder.id, channel: "email", recipient: reminder.recipient_email, status: "queued" });
          } else {
            const send = await sendEmail(reminder.recipient_email, subject, message);
            deliveries.push({
              reminder_id: reminder.id,
              household_id: null,
              channel: "email",
              recipient: reminder.recipient_email,
              scheduled_for: todayIso,
              status: send.ok ? "sent" : "failed",
              provider_message_id: send.providerMessageId ?? null,
              error_message: send.error ?? null,
            });
            results.push({ reminderId: reminder.id, channel: "email", recipient: reminder.recipient_email, status: send.ok ? "sent" : "failed", error: send.error ?? null });
          }
        }
      }
    }

    if (!dryRun && deliveries.length > 0) {
      const { error: insertError } = await admin.from("reminder_deliveries").insert(deliveries);
      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message, results }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const deliveredReminderIds = Array.from(new Set(deliveries.filter(d => d.status === "sent").map(d => d.reminder_id)));
      for (const reminderId of deliveredReminderIds) {
        await admin
          .from("reminders")
          .update({ last_notified_at: new Date().toISOString(), last_notification_error: null })
          .eq("id", reminderId as string);
      }

      const failedDeliveries = deliveries.filter(d => d.status === "failed");
      for (const failed of failedDeliveries) {
        await admin
          .from("reminders")
          .update({ last_notification_error: failed.error_message ?? "Delivery failed" })
          .eq("id", failed.reminder_id as string);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, dryRun, dueToday: dueToday.length, attempted: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
