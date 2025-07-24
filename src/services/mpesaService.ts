import axios from "axios";
import { config } from "../config";
import qs from "querystring";

const MPESA_BASE_URL =
  config.mpesa.environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

export class MpesaService {
  static async getAccessToken(): Promise<string> {
    const { consumerKey, consumerSecret } = config.mpesa;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      "base64"
    );
    const response = await axios.get(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );
    return response.data.access_token;
  }

  static async initiateStkPush({
    phoneNumber,
    amount,
    accountReference = "VukaWiFi",
    transactionDesc = "WiFi Plan Payment",
    callbackUrl = config.mpesa.callbackUrl,
  }: {
    phoneNumber: string;
    amount: number;
    accountReference?: string;
    transactionDesc?: string;
    callbackUrl?: string;
  }): Promise<any> {
    const accessToken = await MpesaService.getAccessToken();
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:Z.]/g, "")
      .slice(0, 14);
    const password = Buffer.from(
      `${config.mpesa.businessShortCode}${config.mpesa.passkey}${timestamp}`
    ).toString("base64");

    const payload = {
      BusinessShortCode: config.mpesa.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: config.mpesa.businessShortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    };

    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  }

  // Validate webhook signature (optional, for extra security)
  static validateWebhook(req: any): boolean {
    // For sandbox, usually not enforced. In production, implement signature check if needed.
    return true;
  }
}

export default MpesaService;
