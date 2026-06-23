export const deptConfig = {
  breakfast: {
    label: "早餐部",
    time: "早上～下午供應",
    headerBg: "bg-[#E23D28]",
    btnBg: "bg-[#E23D28] hover:bg-[#c9321f]",
    btnText: "text-[#E23D28]",
    selectedBtn: "bg-[#E23D28] text-white border-[#E23D28]",
    ringColor: "focus:ring-[#E23D28]/40",
  },
  lunch: {
    label: "午餐部",
    time: "11:00 ~ 13:00",
    headerBg: "bg-[#FF6B35]",
    btnBg: "bg-[#FF6B35] hover:bg-[#e55a28]",
    btnText: "text-[#FF6B35]",
    selectedBtn: "bg-[#FF6B35] text-white border-[#FF6B35]",
    ringColor: "focus:ring-[#FF6B35]/40",
  },
} as const;

export type Department = keyof typeof deptConfig;

export function getDeptConfig(dept: string) {
  return deptConfig[dept as Department] ?? deptConfig.breakfast;
}
