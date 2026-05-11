export type DailyReportFormFieldsModel = {
  responsiblePersonId: string;
  startStr: string;
  endStr: string;
  chargeNightPackYen: number;
  productSalesYen: number;
  taxFreeCouponCounts: Record<string, number>;
  newageYen: number;
  airpayQrYen: number;
  cashInDrawerYen: number;
  deviationReason: string;
};

export type ResponsiblePersonOption = {
  id: string;
  name: string;
};

export type WebmasterOption = {
  id: string;
  username: string;
};
