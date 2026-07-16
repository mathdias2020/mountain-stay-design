import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWhatsappNumber } from "@/lib/home.functions";

const MESSAGE = "Vim do site e tenho uma dúvida";

export function FloatingWhatsApp() {
  const fetchNumber = useServerFn(getWhatsappNumber);
  const { data } = useQuery({
    queryKey: ["admin_whatsapp"],
    queryFn: () => fetchNumber(),
    staleTime: 60_000,
  });

  const number = data?.number;
  if (!number) return null;

  const href = `https://wa.me/${number}?text=${encodeURIComponent(MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-20 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:bottom-6"
      style={{ backgroundColor: "#25D366" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className="h-7 w-7 fill-white"
        aria-hidden="true"
      >
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.215-.515.215-.973.143-1.077-.058-.13-.27-.18-.602-.33Zm-2.825 8.122c-1.945 0-3.832-.602-5.394-1.74L7.5 24.66l1.116-3.31a9.36 9.36 0 0 1-1.819-5.554c0-5.179 4.222-9.4 9.4-9.4 5.18 0 9.4 4.221 9.4 9.4 0 5.179-4.22 9.4-9.4 9.4Zm0-20.602C9.957 4.725 4.725 9.957 4.725 16.285c0 2.163.615 4.265 1.79 6.08L4.5 27.85l5.602-1.967a11.5 11.5 0 0 0 6.183 1.79c6.33 0 11.56-5.232 11.56-11.56 0-6.328-5.23-11.56-11.56-11.56Z" />
      </svg>
    </a>
  );
}