import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface CardImagePreviewProps {
  imageUri?: string | null;
  name: string;
  children: React.ReactNode;
}

export function CardImagePreview({ imageUri, name, children }: CardImagePreviewProps) {
  if (!imageUri) return <>{children}</>;

  const largeUri = imageUri
    .replace("/small/", "/large/")
    .replace("/normal/", "/large/")
    .replace("?version=small", "?version=large")
    .replace("?version=normal", "?version=large");

  return (
    <HoverCard openDelay={250} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        sideOffset={12}
        className="w-auto p-0 border-0 bg-transparent shadow-none"
      >
        <img
          src={largeUri}
          alt={name}
          className="w-[240px] rounded-2xl shadow-2xl border border-white/10"
        />
      </HoverCardContent>
    </HoverCard>
  );
}
