import { toast as notify } from "sonner";
export function toast({
  title,
  description,
  variant,
}: {
  title?: string;
  description?: string;
  variant?: string;
}) {
  const id = (variant === "destructive" ? notify.error : notify)(title ?? "", {
    description,
  });
  return {
    id,
    dismiss: () => notify.dismiss(id),
    update: (options: { title?: string; description?: string }) =>
      notify(options.title ?? "", { id, description: options.description }),
  };
}
export const useToast = () => ({ toast, dismiss: notify.dismiss });
