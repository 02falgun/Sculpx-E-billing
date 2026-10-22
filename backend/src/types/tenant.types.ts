/** Who is onboarding a hotel: a SUPER_ADMIN user or the platform bootstrap token. */
export interface OnboardActor {
  actorId?: string;
  actorEmail: string;
  ipAddress: string;
}
