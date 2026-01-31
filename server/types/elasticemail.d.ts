declare module '@elasticemail/elasticemail-client' {
  export const ApiClient: {
    instance: {
      authentications: {
        apikey: {
          apiKey: string;
        };
      };
    };
  };
  
  export class EmailsApi {
    emailsPost(emailData: any, callback: (error: any, data: any, response: any) => void): void;
  }
  
  export const EmailMessageData: {
    constructFromObject(obj: any): any;
  };
  
  export class EmailRecipient {
    constructor(email: string);
  }
  
  export const BodyPart: {
    constructFromObject(obj: any): any;
  };
}
