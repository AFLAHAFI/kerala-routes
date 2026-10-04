export type ChatMessage={id:string;player:string;name:string;text:string;at:number};
export const REPORT_REASONS=['Abusive chat','Threats','Harassment','Spam','Inappropriate username','Disruptive driving'] as const;
export type ReportRequest={target:string;reason:string;messageId?:string};
export type ModerationRecord={id:string;room:string;reporter:string;target:string;reason:string;at:number;kind:'report'|'mute'|'kick'|'ban';duration?:number;evidence:ChatMessage[]};
