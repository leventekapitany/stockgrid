import { Button } from "@stock/ui/button";

import { authClient } from "~/auth/client";

export function AuthButton() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <Button type="button" size="sm" variant="outline" disabled>
        Checking
      </Button>
    );
  }

  if (!session) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          void authClient.signIn.social({
            provider: "google",
            callbackURL: "/",
          });
        }}
      >
        Sign in with Google
      </Button>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {session.user.image ? (
        <img
          src={session.user.image}
          alt=""
          className="border-border size-8 rounded-full border"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
        {session.user.name}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          void authClient.signOut();
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
