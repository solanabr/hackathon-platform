// Tags for the unstable_cache data layer. Admin mutations revalidate these
// (Next 16 signature: revalidateTag(tag, "max")); the 5-minute revalidate on
// the readers is only the backstop for writes that bypass the actions.
export const HACKATHONS_TAG = "hackathons";
export const hackathonTag = (slug: string) => `hackathon:${slug}`;
export const sponsorsTag = (hackathonId: string) => `sponsors:${hackathonId}`;
