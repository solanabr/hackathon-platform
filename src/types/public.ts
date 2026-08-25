// Shapes of the public security_barrier views (00032). Cast targets for
// anon-safe reads; never expose the underlying member-scoped tables.

export type PublicSubmission = {
  id: string;
  project_name: string | null;
  description: string | null;
  image_path: string | null;
  github_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  demo_video_url: string | null;
  pitch_video_url: string | null;
  status: string;
  submitted_at: string | null;
  team_id: string;
  team_name: string;
  team_leader_id: string;
  team_leader_name: string | null;
  hackathon_id: string;
  hackathon_slug: string;
  hackathon_name: string;
};

export type PublicProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  github_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
};

export type PublicTeamMember = PublicProfile & { team_id: string; user_id: string };
