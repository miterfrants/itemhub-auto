import fs from "fs";
import fetch from "node-fetch";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// inject env from file
const envFromFile = fs.readFileSync(`${__dirname}/.env`).toString();
const API_END_POINT = "https://itemhub.homo.tw/api/v1/";
envFromFile.split("\n").forEach((item) => {
  const array = item.split("=");
  const key = array[0];
  const value = array[1];
  process.env[key] = value;
});
const API_END_POINT = process.env.API_END_POINT ||  "https://itemhub.homo.tw/api/v1/";

(async () => {
  console.log(new Date());
  const streamOfSendVerifyEmail = await sendVerifyEmail(
    "miterfrants+robot@gmail.com"
  );
  const respOfSendVerifyEmail = await streamOfSendVerifyEmail.json();
  const errorMessages = [];
  if (respOfSendVerifyEmail.status !== "OK") {
    errorMessages.push(
      `send verify email error: ${JSON.stringify(respOfSendVerifyEmail)}`
    );
  }

  const streamOfVerifyEmail = await verifyEmail(
    "miterfrants+robot@gmail.com",
    "000000"
  );
  const respOfVerifyEmail = await streamOfVerifyEmail.json();
  if (!respOfVerifyEmail.token) {
    errorMessages.push(
      `verify email error: ${JSON.stringify(respOfVerifyEmail)}`
    );
  }

  const streamOfSendVerifyPhone = await sendVerifyPhone(
    respOfVerifyEmail.token,
    "0912345678",
    "000000"
  );
  const respOfSendVerifyPhone = await streamOfSendVerifyPhone.json();
  if (respOfSendVerifyPhone.status !== "OK") {
    errorMessages.push(
      `send verify phone error: ${JSON.stringify(respOfSendVerifyPhone)}`
    );
  }

  const streamOfVerifyPhone = await verifyPhone(
    "0912345678",
    respOfVerifyEmail.token,
    "000000"
  );
  const respOfVerifyPhone = await streamOfVerifyPhone.json();
  if (!respOfVerifyPhone.token) {
    errorMessages.push(
      `verify phone error: ${JSON.stringify(respOfVerifyPhone)}`
    );
  }

  const streamOfRegister = await register(
    respOfVerifyPhone.token,
    "Peter",
    "Huang",
    "@Testing123123"
  );
  const respOfRegister = await streamOfRegister.json();
  if (!respOfRegister.token) {
    errorMessages.push(`register : ${JSON.stringify(respOfRegister)}`);
  }

  // check dashboard api
  const dashboardToken = respOfRegister.dashboardToken;
  const token = respOfRegister.token;

  // get subscription
  const streamOfGetSubscription = await getSubscription(token);
  const respOfGetSubscription = await streamOfGetSubscription.json();
  if (respOfGetSubscription.errorKey !== "NO_SUBSCRIPTION") {
    errorMessages.push("new user subscription error");
  }

  // get empty devices
  const streamOfDevices = await getDevices(dashboardToken);
  const respOfDevices = await streamOfDevices.json();
  if (JSON.stringify(respOfDevices.devices) !== "[]") {
    errorMessages.push("new user devices is not empty");
  }

  // create device
  const streamOfCreateDevice = await createDevice(
    "robot testing",
    dashboardToken
  );
  const respOfCreateDevice = await streamOfCreateDevice.json();
  if (!respOfCreateDevice.id) {
    errorMessages.push(
      `create device failed: ${JSON.stringify(respOfCreateDevice)}`
    );
  }

  // get devices
  const streamOfDevicesNo2 = await getDevices(dashboardToken);
  const respOfDevicesNo2 = await streamOfDevicesNo2.json();
  if (respOfDevicesNo2.devices.length !== 1) {
    errorMessages.push("devices length expect 1 but get not 1");
  }
  // bundle firmware
  const streamOfBundle = await bundleFirmware(
    respOfCreateDevice.id,
    dashboardToken
  );
  if (streamOfBundle.statusText !== "OK") {
    errorMessages.push(`bundle fail: ${JSON.stringify(streamOfBundle)}`);
  }

  // delete device
  const streamOfDeleteDevice = await deleteDevice(
    respOfCreateDevice.id,
    dashboardToken
  );
  const respOfDeleteDevice = await streamOfDeleteDevice.json();
  if (respOfDeleteDevice.status !== "OK") {
    errorMessages.push("delete devic fail");
  }

  const streamOfDropSelf = await dropSelf(token);
  const respOfDropSelf = await streamOfDropSelf.json();

  if (respOfDropSelf.status !== "OK") {
    errorMessages.push(`drop user error: ${JSON.stringify(respOfDropSelf)}`);
  }

  if (errorMessages.length > 0) {
    notifySMS(errorMessages.join("\n"));
  }
})();
// }

async function sendVerifyEmail(email) {
  const resp = await fetch(`${API_END_POINT}auth/send-verify-email`, {
    method: "POST",
    body: JSON.stringify({ email }),
    headers: { "Content-Type": "application/json" },
  });
  return resp;
}

async function verifyEmail(email, code) {
  const resp = await fetch(`${API_END_POINT}auth/verify-email`, {
    method: "POST",
    body: JSON.stringify({ email, code }),
    headers: { "Content-Type": "application/json" },
  });
  return resp;
}

async function register(token, firstName, lastName, password) {
  const resp = await fetch(`${API_END_POINT}auth/sign-up`, {
    method: "POST",
    body: JSON.stringify({
      firstName,
      lastName,
      password,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return resp;
}

async function sendVerifyPhone(token, phone, code) {
  const resp = await fetch(`${API_END_POINT}auth/send-sms`, {
    method: "POST",
    body: JSON.stringify({
      phone,
      code,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return resp;
}

async function verifyPhone(phone, token, code) {
  const resp = await fetch(`${API_END_POINT}auth/verify-phone`, {
    method: "POST",
    body: JSON.stringify({ phone, code, verifyPhoneToken: token }),
    headers: { "Content-Type": "application/json" },
  });
  return resp;
}

async function dropSelf(token) {
  const resp = await fetch(`${API_END_POINT}auth/drop-self`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return resp;
}

async function getSubscription(token) {
  const resp = await fetch(`${API_END_POINT}my/subscription`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return resp;
}

async function getDevices(token) {
  const resp = await fetch(`${API_END_POINT}my/devices?page=1&limit=100`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return resp;
}

async function createDevice(name, token) {
  const resp = await fetch(`${API_END_POINT}my/devices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, Microcontroller: 1, Protocol: 0 }),
  });
  return resp;
}

async function deleteDevice(id, token) {
  const resp = await fetch(`${API_END_POINT}my/devices/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return resp;
}

async function bundleFirmware(id, token) {
  const resp = await fetch(`${API_END_POINT}my/devices/${id}/bundle-firmware`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return resp;
}

async function notifySMS(message) {
  console.log(message);
  const streamOfSendSMS = await fetch(
    `https://api.e8d.tw/API21/HTTP/sendSMS.ashx`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `UID=${process.env.SMS_USERNAME}&PWD=${process.env.SMS_PASSWORD}&DEST=${process.env.SMS_DEST_PHONE}&MSG=itemhub auto test error: ${message}`,
    }
  );
  if (streamOfSendSMS.status !== 200) {
    const resp = await streamOfSendSMS.json();
    console.log(resp);
  }
}
