export const deptConfig = {
  breakfast: {
    label: "早餐部",
    time: "早上～下午供應",
    headerBg: "bg-amber-500",
    btnBg: "bg-amber-500 hover:bg-amber-600",
    btnText: "text-amber-500",
    selectedBtn: "bg-amber-500 text-white border-amber-500",
    ringColor: "focus:ring-amber-300",
  },
  lunch: {
    label: "午餐部",
    time: "11:00 ~ 13:00",
    headerBg: "bg-orange-500",
    btnBg: "bg-orange-500 hover:bg-orange-600",
    btnText: "text-orange-500",
    selectedBtn: "bg-orange-500 text-white border-orange-500",
    ringColor: "focus:ring-orange-300",
  },
} as const;

export type Department = keyof typeof deptConfig;

export function getDeptConfig(dept: string) {
  return deptConfig[dept as Department] ?? deptConfig.breakfast;
}
