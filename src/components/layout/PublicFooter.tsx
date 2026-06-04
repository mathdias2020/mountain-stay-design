import { MountainSilhouette } from "@/components/brand/MountainSilhouette";

export function PublicFooter() {
  return (
    <footer className="bg-primary text-white">
      <div className="leading-[0]">
        <MountainSilhouette
          backColor="#4E5438"
          frontColor="#5A6045"
          height={80}
          flipped
        />
      </div>
      <div className="mx-auto max-w-7xl px-6 py-8 text-center">
        <p className="font-semibold">RotainStay — Nas Montanhas</p>
        <p
          className="mt-1"
          style={{ fontSize: "13px", fontWeight: 400, color: "#DDDCD9" }}
        >
          © 2025 RotainStay. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}

export default PublicFooter;