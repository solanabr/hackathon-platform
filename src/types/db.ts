export type User = {
  id: string;
  email: string;
  full_name: string | null;
  github_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  telegram_handle: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type HackathonStatus =
  | "draft"
  | "published"
  | "submissions_open"
  | "judging"
  | "closed";

export type Hackathon = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  status: HackathonStatus;
  starts_at: string;
  registration_closes_at: string | null;
  submission_deadline_at: string;
  finalists_announced_at: string | null;
  presential_at: string | null;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  finalists_count: number | null;
  cover_image_path: string | null;
  location_name: string | null;
  location_city: string | null;
  luma_url: string | null;
  community_url: string | null;
  prize_summary: string | null;
  rules_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  hackathon_id: string;
  name: string;
  description: string | null;
  leader_id: string;
  locked: boolean;
  is_finalist: boolean;
  finalist_notified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  team_id: string;
  hackathon_id: string;
  user_id: string | null;
  invited_email: string;
  is_leader: boolean;
  status: "pending" | "accepted" | "removed";
  invite_token: string | null;
  invited_at: string;
  accepted_at: string | null;
};

export type Submission = {
  id: string;
  team_id: string;
  project_name: string | null;
  description: string | null;
  pitch_url: string | null;
  pitch_video_url: string | null;
  demo_video_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  image_path: string | null;
  pitch_deck_url: string | null;
  github_access_granted: boolean;
  status: "draft" | "submitted";
  submitted_at: string | null;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentKind =
  | "aula"
  | "workshop"
  | "mentoria"
  | "material"
  | "link"
  | "evento";

export type HackathonContent = {
  id: string;
  hackathon_id: string;
  kind: ContentKind;
  title: string;
  speaker: string | null;
  description: string | null;
  youtube_id: string | null;
  external_url: string | null;
  location: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  position: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type HackathonRegistration = {
  id: string;
  hackathon_id: string;
  user_id: string;
  registered_at: string;
  luma_confirmed_at: string | null;
  terms_accepted_at: string | null;
};

export type PlatformRole = {
  id: string;
  user_id: string;
  role: "admin" | "judge";
  hackathon_id: string | null;
  granted_by: string | null;
  granted_at: string;
};
