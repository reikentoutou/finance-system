import { parseHmToMinute } from '@/utils/time-parse';

type FormSlice = {
  responsiblePersonId: string;
  startStr: string;
  endStr: string;
  cashInDrawerYen: number;
  deviationReason: string;
};

/** 从「填写」进入「确认」前的共用校验；返回错误文案或 null */
export function validateDailyReportGoToConfirm(opts: {
  form: FormSlice;
  registerFloatAmount: number;
  ddnFile: File | null;
  savedDdnPhotoKey: string | null;
  /** 仅管理员新建 */
  admin?: {
    isNew: boolean;
    createdByUserId: string;
    reportDate: string;
    shiftId: string;
  };
}): string | null {
  const { form, registerFloatAmount, ddnFile, savedDdnPhotoKey, admin } = opts;
  if (admin?.isNew) {
    if (!admin.createdByUserId || !admin.reportDate || !admin.shiftId) {
      return '日付・シフト・提出元（網管）を確認してください';
    }
  }
  if (!form.responsiblePersonId) {
    return '責任者を選択してください';
  }
  if (form.cashInDrawerYen < registerFloatAmount) {
    return 'レジ実点（底銭込）はレジ底銭以上の金額を入力してください';
  }
  const sm = parseHmToMinute(form.startStr);
  const em = parseHmToMinute(form.endStr);
  if (sm === em) {
    return '開始と終了を同じ時刻にはできません';
  }
  if (!ddnFile && !savedDdnPhotoKey) {
    return 'DDN（画像／PDF）は必須です。ファイルを選択してください。';
  }
  return null;
}

/** 正式提交前（confirmCash 弹窗与发 HTTP 之前）的共用校验 */
export function validateDailyReportSubmit(opts: {
  form: FormSlice;
  registerFloatAmount: number;
  ddnFile: File | null;
  savedDdnPhotoKey: string | null;
  previewDeviationYen: number;
  admin?: {
    isNew: boolean;
    createdByUserId: string;
    reportDate: string;
    shiftId: string;
  };
}): string | null {
  const { form, registerFloatAmount, ddnFile, savedDdnPhotoKey, previewDeviationYen, admin } =
    opts;
  if (!form.responsiblePersonId) {
    return '責任者を選択してください';
  }
  if (admin?.isNew) {
    if (!admin.createdByUserId || !admin.reportDate || !admin.shiftId) {
      return '日付・シフト・提出元（網管）を確認してください';
    }
  }
  if (!ddnFile && !savedDdnPhotoKey) {
    return 'DDN（画像／PDF）は必須です。ファイルを選択してください。';
  }
  if (form.cashInDrawerYen < registerFloatAmount) {
    return 'レジ実点（底銭込）はレジ底銭以上の金額を入力してください';
  }
  if (previewDeviationYen < 0) {
    if (!form.deviationReason?.trim()) {
      return '負の偏差の場合は理由を入力してください';
    }
  }
  return null;
}
