import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      duration={4000}
      visibleToasts={3}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:bg-[#D4EDDA] group-[.toaster]:text-[#1A5C2A] group-[.toaster]:border-0 group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-[#3A7D44] group-[.toaster]:border-solid",
          error:
            "group-[.toaster]:bg-[#F8D7DA] group-[.toaster]:text-[#6B1F1F] group-[.toaster]:border-0 group-[.toaster]:border-l-[3px] group-[.toaster]:border-l-[#A63C2E] group-[.toaster]:border-solid",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
