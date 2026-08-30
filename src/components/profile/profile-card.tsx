"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { ProfileForm } from "@/components/profile/profile-form";
import { telegramUrl } from "@/lib/team-up";
import type { User } from "@/types/db";

export function ProfileCard({
  userId,
  email,
  profile,
  next,
}: {
  userId: string;
  email: string;
  profile: User | null;
  next?: string;
}) {
  // Arriving mid-flow (?next) or without a name means the form is the point.
  const [editing, setEditing] = useState(!profile?.full_name || !!next);

  const socials = [
    { href: profile?.github_url, label: "GitHub" },
    { href: profile?.twitter_url, label: "X" },
    { href: profile?.linkedin_url, label: "LinkedIn" },
    { href: profile?.telegram_handle ? telegramUrl(profile.telegram_handle) : null, label: "Telegram" },
  ].filter((s): s is { href: string; label: string } => !!s.href);

  return (
    <Card sticker className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
          Perfil
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="whitespace-nowrap rounded-full border-2 border-green-dark px-4 py-1.5 text-sm font-bold text-ink transition-colors hover:bg-green-dark/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Editar perfil
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-6 sm:flex-row sm:items-start">
        <AvatarUpload
          userId={userId}
          currentUrl={profile?.avatar_url ?? null}
          name={profile?.full_name ?? email}
        />

        <div className="min-w-0 flex-1">
          {editing ? (
            <ProfileForm
              profile={profile}
              next={next}
              onSaved={() => setEditing(false)}
              onCancel={profile?.full_name ? () => setEditing(false) : undefined}
            />
          ) : (
            <>
              <h1 className="font-heading text-3xl font-bold">
                {profile?.full_name ?? "Sua conta"}
              </h1>
              {profile?.headline && <p className="mt-1 text-muted">{profile.headline}</p>}
              <p className="mt-2 font-mono text-sm text-muted">{email}</p>

              {profile?.bio && (
                <p className="mt-4 max-w-xl leading-relaxed text-ink">{profile.bio}</p>
              )}

              {socials.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-green-dark/15 px-3 py-1 text-sm font-semibold text-muted transition-colors hover:border-emerald/40 hover:text-ink"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
