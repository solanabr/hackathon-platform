import { GithubLogoIcon, LinkedinLogoIcon, TelegramLogoIcon, XLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { telegramUrl } from "@/lib/team-up";

type Contacts = {
  telegram_handle?: string | null;
  github_url?: string | null;
  twitter_url?: string | null;
  linkedin_url?: string | null;
};

const LINK_CLASS =
  "text-ink/60 transition-colors hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow";

export function ContactIcons({ contacts, size = 20 }: { contacts: Contacts; size?: number }) {
  const items = [
    {
      href: contacts.telegram_handle ? telegramUrl(contacts.telegram_handle) : null,
      label: "Telegram",
      Icon: TelegramLogoIcon,
    },
    { href: contacts.github_url ?? null, label: "GitHub", Icon: GithubLogoIcon },
    { href: contacts.twitter_url ?? null, label: "X / Twitter", Icon: XLogoIcon },
    { href: contacts.linkedin_url ?? null, label: "LinkedIn", Icon: LinkedinLogoIcon },
  ].filter((i) => i.href);

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2.5">
      {items.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href as string}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className={LINK_CLASS}
        >
          <Icon size={size} weight="fill" />
        </a>
      ))}
    </div>
  );
}
