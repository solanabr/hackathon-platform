import Loading from "@/components/ui/loading";

// Boundary at the segment that changes on tab switches — without it the
// router holds the old page and the click feels dead.
export default function EditionSectionLoading() {
  return <Loading className="min-h-[70vh]" />;
}
