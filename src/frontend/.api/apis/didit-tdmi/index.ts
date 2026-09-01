import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core'
import Oas from 'oas';
import APICore from 'api/dist/core';
import definition from './openapi.json';

class SDK {
  spec: Oas;
  core: APICore;

  constructor() {
    this.spec = Oas.init(definition);
    this.core = new APICore(this.spec, 'didit-tdmi/1.0.0 (api/6.1.3)');
  }

  /**
   * Optionally configure various options that the SDK allows.
   *
   * @param config Object of supported SDK options and toggles.
   * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
   * should be represented in milliseconds.
   */
  config(config: ConfigOptions) {
    this.core.setConfig(config);
  }

  /**
   * If the API you're using requires authentication you can supply the required credentials
   * through this method and the library will magically determine how they should be used
   * within your API request.
   *
   * With the exception of OpenID and MutualTLS, it supports all forms of authentication
   * supported by the OpenAPI specification.
   *
   * @example <caption>HTTP Basic auth</caption>
   * sdk.auth('username', 'password');
   *
   * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
   * sdk.auth('myBearerToken');
   *
   * @example <caption>API Keys</caption>
   * sdk.auth('myApiKey');
   *
   * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
   * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
   * @param values Your auth credentials for the API; can specify up to two strings or numbers.
   */
  auth(...values: string[] | number[]) {
    this.core.setAuth(...values);
    return this;
  }

  /**
   * If the API you're using offers alternate server URLs, and server variables, you can tell
   * the SDK which one to use with this method. To use it you can supply either one of the
   * server URLs that are contained within the OpenAPI definition (along with any server
   * variables), or you can pass it a fully qualified URL to use (that may or may not exist
   * within the OpenAPI definition).
   *
   * @example <caption>Server URL with server variables</caption>
   * sdk.server('https://{region}.api.example.com/{basePath}', {
   *   name: 'eu',
   *   basePath: 'v14',
   * });
   *
   * @example <caption>Fully qualified server URL</caption>
   * sdk.server('https://eu.api.example.com/v14');
   *
   * @param url Server URL
   * @param variables An object of variables to replace into the server URL.
   */
  server(url: string, variables = {}) {
    this.core.setServer(url, variables);
  }

  /**
   * The Create Session API allows you to generate a URL for a specific workflow where your
   * users can start verifying their identity. Each application is rate-limited per minute —
   * free workflows allow up to 10 session creations per minute, while paid workflows allow
   * up to 600. When these limits are exceeded the endpoint responds with HTTP 429 including
   * standard rate-limit headers so you can decide when to retry.
   *
   * @summary Create Session
   * @throws FetchError<400, types.PostV2SessionResponse400> Bad Request
   * @throws FetchError<403, types.PostV2SessionResponse403> Forbidden
   * @throws FetchError<429, types.PostV2SessionResponse429> Too Many Requests
   */
  post_v2session(body: types.PostV2SessionBodyParam, metadata: types.PostV2SessionMetadataParam): Promise<FetchResponse<201, types.PostV2SessionResponse201>> {
    return this.core.fetch('/v3/session/', 'post', body, metadata);
  }

  /**
   * The Retrieve Session API allows you to retrieve the results of a verification session.
   *
   * @summary Retrieve Session
   */
  get_v2sessionSessionIdDecision(metadata: types.GetV2SessionSessionIdDecisionMetadataParam): Promise<FetchResponse<200, types.GetV2SessionSessionIdDecisionResponse200>> {
    return this.core.fetch('/v3/session/{sessionId}/decision/', 'get', metadata);
  }

  /**
   * The Delete Session API allows you to delete a verification session with all their data
   * associated.
   *
   * @summary Delete Session
   * @throws FetchError<404, types.DeleteV1SessionSessionIdResponse404> Not Found
   */
  delete_v1sessionSessionId(metadata: types.DeleteV1SessionSessionIdMetadataParam): Promise<FetchResponse<204, types.DeleteV1SessionSessionIdResponse204>> {
    return this.core.fetch('/v3/session/{sessionId}/delete/', 'delete', metadata);
  }

  /**
   * The Generate PDF API allows you to generate a PDF report for a verification session.
   *
   * @summary Generate PDF
   */
  get_v1sessionSessionIdGeneratePdf(metadata: types.GetV1SessionSessionIdGeneratePdfMetadataParam): Promise<FetchResponse<200, types.GetV1SessionSessionIdGeneratePdfResponse200>> {
    return this.core.fetch('/v3/session/{sessionId}/generate-pdf', 'get', metadata);
  }

  /**
   * The Update Status API allows you to update the status of a finished verification session
   * programatically.
   *
   * @summary Update Status
   * @throws FetchError<400, types.PatchV1SessionSessionIdUpdateStatusResponse400> Bad Request
   */
  patch_v1sessionSessionIdUpdateStatus(body: types.PatchV1SessionSessionIdUpdateStatusBodyParam, metadata: types.PatchV1SessionSessionIdUpdateStatusMetadataParam): Promise<FetchResponse<200, types.PatchV1SessionSessionIdUpdateStatusResponse200>> {
    return this.core.fetch('/v3/session/{sessionId}/update-status/', 'patch', body, metadata);
  }

  /**
   * The ID Verification API allows you to verify identity documents by submitting images of
   * the document's front and back sides (when applicable). This API extracts and validates
   * document information, performs authenticity checks, and returns structured data from the
   * document.
   *
   * @summary ID Verification
   * @throws FetchError<400, types.PostV2IdVerificationResponse400> Bad Request
   * @throws FetchError<403, types.PostV2IdVerificationResponse403> Forbidden
   */
  post_v2idVerification(body: types.PostV2IdVerificationBodyParam, metadata: types.PostV2IdVerificationMetadataParam): Promise<FetchResponse<200, types.PostV2IdVerificationResponse200>> {
    return this.core.fetch('/v3/id-verification/', 'post', body, metadata);
  }

  /**
   * The Face Match API enables you to compare two facial images to determine if they belong
   * to the same person. It is ideal for identity verification, access control, and user
   * authentication. <br>**Note**: If multiple faces appear in an image, the API uses the
   * face with the largest area to calculate the similarity score.
   *
   * @summary Face Match
   * @throws FetchError<403, types.PostV2FaceMatchResponse403> Forbidden
   */
  post_v2faceMatch(body: types.PostV2FaceMatchBodyParam, metadata: types.PostV2FaceMatchMetadataParam): Promise<FetchResponse<200, types.PostV2FaceMatchResponse200>> {
    return this.core.fetch('/v3/face-match/', 'post', body, metadata);
  }

  /**
   * The Age Estimation API allows you to estimate a person's age based on facial analysis.
   * This API can be used for age verification, demographic analysis, or personalized user
   * experiences. Additionally, we perform a passive liveness test to ensure the submitted
   * image is of a real person and not a spoof attempt.
   *
   * @summary Age Estimation
   * @throws FetchError<403, types.PostV2AgeEstimationResponse403> Forbidden
   */
  post_v2ageEstimation(body: types.PostV2AgeEstimationBodyParam, metadata: types.PostV2AgeEstimationMetadataParam): Promise<FetchResponse<200, types.PostV2AgeEstimationResponse200>> {
    return this.core.fetch('/v3/age-estimation/', 'post', body, metadata);
  }

  /**
   * The Proof of Address (POA) Verification API allows you to verify address documents by
   * submitting document images or PDFs. This API extracts and validates address information,
   * performs authenticity checks, and returns structured data from the document.
   *
   * @summary Proof of Address
   * @throws FetchError<400, types.PostV2PoaResponse400> Bad Request
   * @throws FetchError<403, types.PostV2PoaResponse403> Forbidden
   */
  post_v2poa(body: types.PostV2PoaBodyParam, metadata: types.PostV2PoaMetadataParam): Promise<FetchResponse<200, types.PostV2PoaResponse200>> {
    return this.core.fetch('/v3/poa/', 'post', body, metadata);
  }

  /**
   * The AML Screening API allows you to screen individuals or companies against global
   * watchlists and high-risk databases. This API provides real-time screening capabilities
   * to detect potential matches and mitigate risks associated with financial fraud and
   * terrorism. You can screen both persons and companies by specifying the `entity_type`
   * parameter.
   *
   * @summary AML Screening
   * @throws FetchError<403, types.PostV2AmlResponse403> Forbidden
   */
  post_v2aml(body: types.PostV2AmlBodyParam, metadata: types.PostV2AmlMetadataParam): Promise<FetchResponse<200, types.PostV2AmlResponse200>> {
    return this.core.fetch('/v3/aml/', 'post', body, metadata);
  }

  /**
   * The Face Search API allows you to search for faces in a database of previously verified
   * faces. This API can be used for identity verification, access control, and user
   * authentication.
   *
   * @summary Face Search
   * @throws FetchError<400, types.PostV2FaceSearchResponse400> Bad Request
   * @throws FetchError<403, types.PostV2FaceSearchResponse403> Forbidden
   */
  post_v2faceSearch(body: types.PostV2FaceSearchBodyParam, metadata: types.PostV2FaceSearchMetadataParam): Promise<FetchResponse<200, types.PostV2FaceSearchResponse200>> {
    return this.core.fetch('/v3/face-search/', 'post', body, metadata);
  }

  /**
   * The List Sessions API retrieves a list of verification session results for your
   * application. You can filter the results using optional query parameters, such as
   * `vendor_data`, to narrow down the sessions returned.
   *
   * @summary List Sessions
   */
  get_organizationsOrg_idApplicationApp_idSessions(metadata: types.GetOrganizationsOrgIdApplicationAppIdSessionsMetadataParam): Promise<FetchResponse<200, types.GetOrganizationsOrgIdApplicationAppIdSessionsResponse200>> {
    return this.core.fetch('/v3/sessions', 'get', metadata);
  }

  /**
   * Didit's Share KYC via API feature enables trusted partners to securely share user
   * verification data. This is ideal for scenarios where a user is onboarded on one platform
   * and needs to access a partner service, eliminating the need for the user to undergo the
   * verification process again. This business-to-business sharing streamlines user
   * experience across integrated services. Learn more at [Share KYC via
   * API](/reference/share-kyc-via-api#/).
   *
   * @summary Share Session
   * @throws FetchError<400, types.PostV1SessionSessionIdShareResponse400> Bad Request
   * @throws FetchError<403, types.PostV1SessionSessionIdShareResponse403> Forbidden
   */
  post_v1sessionSessionIdShare(body: types.PostV1SessionSessionIdShareBodyParam, metadata: types.PostV1SessionSessionIdShareMetadataParam): Promise<FetchResponse<200, types.PostV1SessionSessionIdShareResponse200>> {
    return this.core.fetch('/v3/session/{sessionId}/share/', 'post', body, metadata);
  }

  /**
   * The Import Shared Session API is used by partners to import shared verification sessions
   * for Reusable KYC. Learn more at [Share KYC via API](/reference/share-kyc-via-api#/).
   *
   * @summary Import Shared Session
   * @throws FetchError<400, types.PostV1SessionimportSharedResponse400> Bad Request
   * @throws FetchError<403, types.PostV1SessionimportSharedResponse403> Forbidden
   */
  post_v1sessionimportShared(body: types.PostV1SessionimportSharedBodyParam, metadata: types.PostV1SessionimportSharedMetadataParam): Promise<FetchResponse<200, types.PostV1SessionimportSharedResponse200>> {
    return this.core.fetch('/v3/session/import-shared/', 'post', body, metadata);
  }

  /**
   * The passive liveness API allows you to verify that a user is physically present by
   * analyzing a captured image without requiring any explicit movement or interaction from
   * the user.
   *
   * @summary Passive Liveness
   * @throws FetchError<403, types.PostV2PassiveLivenessResponse403> Forbidden
   */
  post_v2passiveLiveness(body: types.PostV2PassiveLivenessBodyParam, metadata: types.PostV2PassiveLivenessMetadataParam): Promise<FetchResponse<200, types.PostV2PassiveLivenessResponse200>> {
    return this.core.fetch('/v3/passive-liveness/', 'post', body, metadata);
  }

  /**
   * The Database Validation API allows you to validate user-provided identity data against
   * authoritative national and global data sources. Supporting both 1x1 and 2x2 matching
   * methods, this API uses a waterfall approach to maximize match rates by sequentially
   * querying multiple providers until a full, conclusive match is found. It enables
   * real-time identity verification, helping you reduce fraud, streamline onboarding, and
   * ensure compliance with regulatory requirements.
   *
   * @summary Database Validation
   * @throws FetchError<403, types.PostV2DatabaseValidationResponse403> Forbidden
   */
  post_v2databaseValidation(body: types.PostV2DatabaseValidationBodyParam, metadata: types.PostV2DatabaseValidationMetadataParam): Promise<FetchResponse<200, types.PostV2DatabaseValidationResponse200>> {
    return this.core.fetch('/v3/database-validation/', 'post', body, metadata);
  }

  /**
   * This endpoint sends a one-time verification code to a specified phone number. It
   * automatically handles blocked numbers and supports a single retry in case the initial
   * attempt fails. Retries are free of charge. The verification code remains valid for 5
   * minutes from the time it is sent.
   *
   * @summary Send Phone Code
   * @throws FetchError<401, types.PostV2PhoneSendResponse401> Unauthorized
   * @throws FetchError<403, types.PostV2PhoneSendResponse403> Forbidden
   * @throws FetchError<429, types.PostV2PhoneSendResponse429> Too Many Requests
   */
  post_v2phone_send(body: types.PostV2PhoneSendBodyParam, metadata: types.PostV2PhoneSendMetadataParam): Promise<FetchResponse<200, types.PostV2PhoneSendResponse200>> {
    return this.core.fetch('/v3/phone/send/', 'post', body, metadata);
  }

  /**
   * This endpoint verifies a one-time code sent to a phone number and returns information
   * about the number. There is a maximum of three verification attempts per code.
   *
   * @summary Check Phone Code
   * @throws FetchError<401, types.PostV2PhoneCheckResponse401> Unauthorized
   * @throws FetchError<403, types.PostV2PhoneCheckResponse403> Forbidden
   * @throws FetchError<404, types.PostV2PhoneCheckResponse404> Not Found
   */
  post_v2phone_check(body: types.PostV2PhoneCheckBodyParam, metadata: types.PostV2PhoneCheckMetadataParam): Promise<FetchResponse<200, types.PostV2PhoneCheckResponse200>> {
    return this.core.fetch('/v3/phone/check/', 'post', body, metadata);
  }

  /**
   * This endpoint sends a one-time verification code to a specified email address. It
   * automatically handles undeliverable emails and supports a single retry in case the
   * initial attempt fails. Retries are free of charge. The verification code remains valid
   * for 5 minutes from the time it is sent.
   *
   * @summary Send Email Code
   * @throws FetchError<401, types.PostV2EmailSendResponse401> Unauthorized
   * @throws FetchError<403, types.PostV2EmailSendResponse403> Forbidden
   */
  post_v2email_send(body: types.PostV2EmailSendBodyParam, metadata: types.PostV2EmailSendMetadataParam): Promise<FetchResponse<200, types.PostV2EmailSendResponse200>> {
    return this.core.fetch('/v3/email/send/', 'post', body, metadata);
  }

  /**
   * This endpoint verifies a one-time code sent to an email address and returns information
   * about the email. There is a maximum of three verification attempts per code.
   *
   * @summary Check Email Code
   * @throws FetchError<401, types.PostV2EmailCheckResponse401> Unauthorized
   * @throws FetchError<403, types.PostV2EmailCheckResponse403> Forbidden
   * @throws FetchError<404, types.PostV2EmailCheckResponse404> Not Found
   */
  post_v2email_check(body: types.PostV2EmailCheckBodyParam, metadata: types.PostV2EmailCheckMetadataParam): Promise<FetchResponse<200, types.PostV2EmailCheckResponse200>> {
    return this.core.fetch('/v3/email/check/', 'post', body, metadata);
  }
}

const createSDK = (() => { return new SDK(); })()
;

export default createSDK;

export type { DeleteV1SessionSessionIdMetadataParam, DeleteV1SessionSessionIdResponse204, DeleteV1SessionSessionIdResponse404, GetOrganizationsOrgIdApplicationAppIdSessionsMetadataParam, GetOrganizationsOrgIdApplicationAppIdSessionsResponse200, GetV1SessionSessionIdGeneratePdfMetadataParam, GetV1SessionSessionIdGeneratePdfResponse200, GetV2SessionSessionIdDecisionMetadataParam, GetV2SessionSessionIdDecisionResponse200, PatchV1SessionSessionIdUpdateStatusBodyParam, PatchV1SessionSessionIdUpdateStatusMetadataParam, PatchV1SessionSessionIdUpdateStatusResponse200, PatchV1SessionSessionIdUpdateStatusResponse400, PostV1SessionSessionIdShareBodyParam, PostV1SessionSessionIdShareMetadataParam, PostV1SessionSessionIdShareResponse200, PostV1SessionSessionIdShareResponse400, PostV1SessionSessionIdShareResponse403, PostV1SessionimportSharedBodyParam, PostV1SessionimportSharedMetadataParam, PostV1SessionimportSharedResponse200, PostV1SessionimportSharedResponse400, PostV1SessionimportSharedResponse403, PostV2AgeEstimationBodyParam, PostV2AgeEstimationMetadataParam, PostV2AgeEstimationResponse200, PostV2AgeEstimationResponse403, PostV2AmlBodyParam, PostV2AmlMetadataParam, PostV2AmlResponse200, PostV2AmlResponse403, PostV2DatabaseValidationBodyParam, PostV2DatabaseValidationMetadataParam, PostV2DatabaseValidationResponse200, PostV2DatabaseValidationResponse403, PostV2EmailCheckBodyParam, PostV2EmailCheckMetadataParam, PostV2EmailCheckResponse200, PostV2EmailCheckResponse401, PostV2EmailCheckResponse403, PostV2EmailCheckResponse404, PostV2EmailSendBodyParam, PostV2EmailSendMetadataParam, PostV2EmailSendResponse200, PostV2EmailSendResponse401, PostV2EmailSendResponse403, PostV2FaceMatchBodyParam, PostV2FaceMatchMetadataParam, PostV2FaceMatchResponse200, PostV2FaceMatchResponse403, PostV2FaceSearchBodyParam, PostV2FaceSearchMetadataParam, PostV2FaceSearchResponse200, PostV2FaceSearchResponse400, PostV2FaceSearchResponse403, PostV2IdVerificationBodyParam, PostV2IdVerificationMetadataParam, PostV2IdVerificationResponse200, PostV2IdVerificationResponse400, PostV2IdVerificationResponse403, PostV2PassiveLivenessBodyParam, PostV2PassiveLivenessMetadataParam, PostV2PassiveLivenessResponse200, PostV2PassiveLivenessResponse403, PostV2PhoneCheckBodyParam, PostV2PhoneCheckMetadataParam, PostV2PhoneCheckResponse200, PostV2PhoneCheckResponse401, PostV2PhoneCheckResponse403, PostV2PhoneCheckResponse404, PostV2PhoneSendBodyParam, PostV2PhoneSendMetadataParam, PostV2PhoneSendResponse200, PostV2PhoneSendResponse401, PostV2PhoneSendResponse403, PostV2PhoneSendResponse429, PostV2PoaBodyParam, PostV2PoaMetadataParam, PostV2PoaResponse200, PostV2PoaResponse400, PostV2PoaResponse403, PostV2SessionBodyParam, PostV2SessionMetadataParam, PostV2SessionResponse201, PostV2SessionResponse400, PostV2SessionResponse403, PostV2SessionResponse429 } from './types';
