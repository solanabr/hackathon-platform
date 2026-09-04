import { Morth, type MorthId } from "@/components/ui/morth";

const shapes: Array<{ id: MorthId; width: number; height: number; className: string }> = [
  { id: "05", width: 210, height: 155, className: "left-[-8%] top-[6%] w-72 animate-float-a" },
  { id: "21", width: 341, height: 322, className: "right-[-6%] top-[38%] w-96 animate-float-b" },
  { id: "12", width: 293, height: 253, className: "bottom-[-4%] left-[18%] w-80 animate-float-c" },
  { id: "24", width: 361, height: 320, className: "right-[10%] bottom-[-6%] w-72 animate-float-b" },
  { id: "27", width: 328, height: 318, className: "left-[28%] top-[22%] w-56 animate-float-c" },
];

export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {shapes.map((shape) => (
        <Morth
          key={shape.id}
          id={shape.id}
          width={shape.width}
          height={shape.height}
          className={`absolute h-auto opacity-[0.07] ${shape.className}`}
        />
      ))}
    </div>
  );
}
