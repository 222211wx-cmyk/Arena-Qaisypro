/** Navigation visibility only. This configuration never mutates feature data. */
export const ACTIVE_ICONS = {
  clips: { id: 5, label: "CLIPS", route: "/clips", active: true },
  messagerie_call: { id: 6, label: "Messagerie", route: "/messages", active: true },
} as const;