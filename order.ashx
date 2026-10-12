<%@ WebHandler Language="C#" Class="OrderHandler" %>

using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Configuration;
using System.IO;
using System.Net;
using System.Text;
using System.Web;
using System.Web.Script.Serialization;

// Receives the EnviroMulch order form (FormData POST) and emails it via the Resend API.
// Settings come from web.config appSettings; the API key never reaches the browser.
// Field names must match index.html (product groups pg0..pg5 / pq0..pq5 follow PRICE_GROUPS order).
public class OrderHandler : IHttpHandler
{
    private static readonly string[][] Contact = {
        new[] {"name","Name"}, new[] {"phone","Phone"}, new[] {"phone2","Alternate Phone"},
        new[] {"email","Email"}, new[] {"address","Delivery Address"}, new[] {"city","City"}, new[] {"zip","ZIP"} };
    private static readonly string[][] Delivery = {
        new[] {"delivery_date","Requested Delivery Date"}, new[] {"delivery_time","Delivery Time Period"},
        new[] {"spread","Gravel Tailgate Spread"} };
    private static readonly string[][] Other = {
        new[] {"notes","Special Instructions"}, new[] {"payment","Payment Method"}, new[] {"heard","How They Heard About Us"} };
    // index -> {selection label, quantity label}; index 4 (IPEMA) also has dimensions
    private static readonly string[][] Groups = {
        new[] {"Mulch","Yards/Scoops"}, new[] {"Soils","Yards/Scoops"}, new[] {"Sand & Stone","Yards/Scoops"},
        new[] {"Baled Products","No. of Bales"}, new[] {"IPEMA Playground Surfacing","Yards/Scoops"},
        new[] {"Certified Wear Mats","Quantity"} };

    public bool IsReusable { get { return false; } }

    public void ProcessRequest(HttpContext ctx)
    {
        ctx.Response.ContentType = "application/json";
        ctx.Response.Cache.SetCacheability(HttpCacheability.NoCache);
        try
        {
            if (!string.Equals(ctx.Request.HttpMethod, "POST", StringComparison.OrdinalIgnoreCase))
            { Fail(ctx, 405, "Method not allowed."); return; }

            NameValueCollection form = ctx.Request.Form;

            // Honeypot: hidden from real users. Pretend success so bots don't retry.
            if (!string.IsNullOrEmpty(form["website"])) { Ok(ctx); return; }

            string name = Val(form, "name"), phone = Val(form, "phone"), address = Val(form, "address"), email = Val(form, "email");
            if (name.Length == 0 || phone.Length == 0 || address.Length == 0)
            { Fail(ctx, 400, "Please enter your name, phone number and delivery address."); return; }
            if (email.Length > 0 && !IsEmail(email))
            { Fail(ctx, 400, "Please enter a valid email address."); return; }

            bool anyProduct = false;
            for (int k = 0; k < Groups.Length; k++) if (Val(form, "pg" + k).Length > 0) anyProduct = true;
            if (!anyProduct) { Fail(ctx, 400, "Please choose at least one product."); return; }

            string apiKey = ConfigurationManager.AppSettings["RESEND_API_KEY"];
            string to = ConfigurationManager.AppSettings["ORDER_TO"];
            string from = ConfigurationManager.AppSettings["ORDER_FROM"];
            if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(to) || string.IsNullOrWhiteSpace(from))
            { Fail(ctx, 500, "The order form is not set up yet."); return; }

            var payload = new Dictionary<string, object>();
            payload["from"] = from;
            payload["to"] = new[] { to };
            payload["subject"] = "Enviromulch Online Order: " + OneLine(name) + " - " + OneLine(address);
            payload["html"] = BuildHtml(form);
            if (email.Length > 0) payload["reply_to"] = email;

            byte[] body = Encoding.UTF8.GetBytes(new JavaScriptSerializer().Serialize(payload));

            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;
            var req = (HttpWebRequest)WebRequest.Create("https://api.resend.com/emails");
            req.Method = "POST";
            req.ContentType = "application/json";
            req.Headers["Authorization"] = "Bearer " + apiKey;
            req.UserAgent = "EnviroMulchOrder/1.0";
            req.Timeout = 30000;
            req.ContentLength = body.Length;
            using (Stream s = req.GetRequestStream()) s.Write(body, 0, body.Length);

            try
            {
                using (var resp = (HttpWebResponse)req.GetResponse())
                {
                    int code = (int)resp.StatusCode;
                    if (code >= 200 && code < 300) { Ok(ctx); return; }
                }
            }
            catch (WebException wex)
            {
                // Log status server-side only; never return Resend's response to the client.
                var r = wex.Response as HttpWebResponse;
                System.Diagnostics.Trace.TraceError("Resend send failed: " + (r != null ? ((int)r.StatusCode).ToString() : wex.Status.ToString()));
            }
            Fail(ctx, 502, "We couldn't send your order right now.");
        }
        catch (Exception ex)
        {
            System.Diagnostics.Trace.TraceError("Order handler error: " + ex.GetType().Name);
            Fail(ctx, 500, "We couldn't send your order right now.");
        }
    }

    private static string Val(NameValueCollection form, string key)
    {
        string v = form[key];
        if (v == null) return "";
        v = v.Trim();
        return v.Length > 5000 ? v.Substring(0, 5000) : v;
    }

    private static string OneLine(string s)
    {
        s = (s ?? "").Replace("\r", " ").Replace("\n", " ").Trim();
        return s.Length > 60 ? s.Substring(0, 60) : s;
    }

    private static bool IsEmail(string e)
    {
        if (e.Length > 254 || e.IndexOfAny(new[] { ' ', '\r', '\n', ',', ';', '<', '>' }) >= 0) return false;
        int at = e.IndexOf('@');
        return at > 0 && at == e.LastIndexOf('@') && e.IndexOf('.', at) > at + 1 && !e.EndsWith(".");
    }

    private static string Enc(string s) { return HttpUtility.HtmlEncode(s ?? ""); }

    private static void Row(StringBuilder rows, string label, string value)
    {
        rows.Append("<tr><td style=\"padding:6px 12px 6px 0;font-size:13px;color:#666;white-space:nowrap;vertical-align:top\"><strong>")
            .Append(Enc(label)).Append("</strong></td><td style=\"padding:6px 0;font-size:13px;color:#111\">")
            .Append(value.Length == 0 ? "<span style=\"color:#aaa\">(blank)</span>" : Enc(value).Replace("\r\n", "<br>").Replace("\n", "<br>"))
            .Append("</td></tr>");
    }

    private static string Section(string title, StringBuilder rows)
    {
        if (rows.Length == 0) return "";
        return "<h3 style=\"font-family:sans-serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#4a7a1f;margin:1.5rem 0 .5rem;padding-bottom:.4rem;border-bottom:1px solid #e5e5e5\">"
            + Enc(title) + "</h3><table style=\"border-collapse:collapse;width:100%\">" + rows + "</table>";
    }

    private static string Fields(NameValueCollection form, string title, string[][] fields)
    {
        var rows = new StringBuilder();
        foreach (var p in fields) Row(rows, p[1], Val(form, p[0]));
        return Section(title, rows);
    }

    private static string BuildHtml(NameValueCollection form)
    {
        var sb = new StringBuilder();
        sb.Append("<div style=\"font-family:sans-serif;max-width:640px;margin:0 auto;color:#111\">");
        sb.Append("<div style=\"background:#1f3a12;padding:20px 28px\"><h2 style=\"margin:0;color:#ffffff;font-size:18px\">New EnviroMulch Order Request</h2></div>");
        sb.Append("<div style=\"padding:8px 28px 24px\">");
        sb.Append(Fields(form, "Customer", Contact));
        sb.Append(Fields(form, "Delivery", Delivery));

        var prod = new StringBuilder();
        for (int k = 0; k < Groups.Length; k++)
        {
            string sel = Val(form, "pg" + k);
            if (sel.Length == 0) continue;
            string qty = Val(form, "pq" + k);
            string line = sel + "  |  " + Groups[k][1] + ": " + (qty.Length > 0 ? qty : "(not given)");
            if (k == 4)
                line += "  |  L " + Val(form, "pl4") + " ft x W " + Val(form, "pw4") + " ft x H " + Val(form, "ph4") + " in";
            Row(prod, Groups[k][0], line);
        }
        sb.Append(Section("Products", prod));
        sb.Append(Fields(form, "Other", Other));
        sb.Append("<p style=\"font-size:12px;color:#666;margin-top:1.5rem\">Prices are per yard (a scoop is a yard). This is a request, not a payment; confirm price, availability and timing with the customer.</p>");
        sb.Append("</div><div style=\"padding:16px 28px;background:#f0f0f0;font-size:12px;color:#999\">Sent from the order form at enviromulchonline.com</div></div>");
        return sb.ToString();
    }

    private static void Ok(HttpContext ctx)
    {
        ctx.Response.StatusCode = 200;
        ctx.Response.Write("{\"ok\":true}");
    }

    private static void Fail(HttpContext ctx, int status, string message)
    {
        ctx.Response.StatusCode = status;
        ctx.Response.TrySkipIisCustomErrors = true;
        var d = new Dictionary<string, object>();
        d["ok"] = false;
        d["error"] = message;
        ctx.Response.Write(new JavaScriptSerializer().Serialize(d));
    }
}
