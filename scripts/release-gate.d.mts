export const TEST_PUBLISHER: string
export const GOOGLE_TAG_ID: string
export function publisherOf(id: string | undefined | null): string | null
export function validateAdmobIds(appId: string | undefined, bannerId: string | undefined): string[]
export function appAdsLine(appId: string | undefined): string | null
export function appAdsTxtAuthorises(text: string | undefined, appId: string | undefined): boolean
export function validateConfirmations(input: { signing?: string; dataSafety?: string; consentTested?: string }): {
  signing: string[]
  dataSafety: string[]
  consentTested: string[]
}
