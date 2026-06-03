import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      duration={4000}
      visibleToasts={3}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-md shadow-lg border-0 border-l-[3px] !p-3",
          title: "font-medium",
          description: "text-sm opacity-90",
          success:
            "!bg-[#D4EDDA] !text-[#1A5C2A] !border-l-[#3A7D44] [&_[data-icon]>svg]:!text-[#3A7D44]",
          error:
            "!bg-[#F8D7DA] !text-[#6B1F1F] !border-l-[#A63C2E] [&_[data-icon]>svg]:!text-[#A63C2E]",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
