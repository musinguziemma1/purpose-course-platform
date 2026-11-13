export type ProfileInput = {
  fullName: string;
  title: string;
  bio: string;
  phone: string;
  location: string;
  timezone: string;
  avatarUrl: string;
};

export function profileError(input: ProfileInput) {
  if (input.fullName.trim().length < 2 || input.fullName.length > 160)
    return "Enter your full name (2–160 characters).";
  if (input.title.length > 160) return "Keep your title to 160 characters.";
  if (input.bio.trim().length < 20 || input.bio.length > 2000)
    return "Introduce yourself in 20–2,000 characters.";
  if (
    !/^[+\d ()-]{7,32}$/.test(input.phone) ||
    input.phone.replace(/\D/g, "").length < 7
  )
    return "Enter a valid phone number, including your country code.";
  if (input.location.trim().length < 2 || input.location.length > 160)
    return "Enter your city and country.";
  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timezone }).format();
  } catch {
    return "Choose a valid time zone.";
  }
  if (input.avatarUrl) {
    try {
      const url = new URL(input.avatarUrl, "https://purpose.invalid");
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        input.avatarUrl.length > 2000
      )
        return "Use an HTTPS profile photo URL or leave it blank.";
      if (
        url.origin === "https://purpose.invalid" &&
        !/^\/api\/media\/[a-f0-9-]{36}$/.test(input.avatarUrl)
      )
        return "Choose a valid profile photo.";
    } catch {
      return "Choose a valid profile photo.";
    }
  }
  return null;
}

export function profileIsComplete(profile: {
  profileCompletedAt?: Date | null;
  fullName?: string;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
}) {
  return Boolean(
    profile.profileCompletedAt &&
      profile.fullName &&
      profile.phone &&
      profile.location &&
      profile.bio,
  );
}
