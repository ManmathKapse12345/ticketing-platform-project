const mockSendMail = jest.fn().mockResolvedValue({});
jest.mock("nodemailer", () => ({ createTransport: () => ({ sendMail: mockSendMail }) }));

const { sendEmail } = require("../src/utils/auth.utils.js");

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  mockSendMail.mockClear();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => "" });
  process.env.EMAIL_USER = "tickets@example.com";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete global.fetch;
});

describe("sendEmail", () => {
  it("uses SMTP when no Brevo key is configured", async () => {
    delete process.env.BREVO_API_KEY;

    await sendEmail("to@example.com", "Hi", "<p>Hi</p>");

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "tickets@example.com", to: "to@example.com", subject: "Hi" }),
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends through Brevo's API, with attachments base64-encoded", async () => {
    process.env.BREVO_API_KEY = "test-key";

    await sendEmail("to@example.com", "Tickets", "<p>Attached</p>", [
      { filename: "tickets.pdf", content: Buffer.from("%PDF"), contentType: "application/pdf" },
    ]);

    expect(mockSendMail).not.toHaveBeenCalled();
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(options.headers["api-key"]).toBe("test-key");
    expect(JSON.parse(options.body)).toEqual({
      sender: { email: "tickets@example.com" },
      to: [{ email: "to@example.com" }],
      subject: "Tickets",
      htmlContent: "<p>Attached</p>",
      attachment: [{ name: "tickets.pdf", content: Buffer.from("%PDF").toString("base64") }],
    });
  });

  it("throws when Brevo rejects the email, so callers see the failure", async () => {
    process.env.BREVO_API_KEY = "test-key";
    global.fetch.mockResolvedValue({ ok: false, status: 401, text: async () => "Key not found" });

    await expect(sendEmail("to@example.com", "Hi", "<p>Hi</p>")).rejects.toThrow(/401.*Key not found/);
  });
});
