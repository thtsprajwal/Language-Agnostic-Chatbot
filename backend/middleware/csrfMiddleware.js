import csrf from "csurf";

const csrfProtection = csrf({
  cookie: {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 1000,
  },
  value: (req) => {
    return req.headers["x-csrf-token"] || req.body?._csrf || "";
  },
  ignoreMethods: ["GET", "HEAD", "OPTIONS"],
});

export const getCsrfTokenResponse = (req, res) => {
  return res.status(200).json({ csrfToken: req.csrfToken() });
};

export default csrfProtection;
