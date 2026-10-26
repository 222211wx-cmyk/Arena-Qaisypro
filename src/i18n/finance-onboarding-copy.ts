import type { Lang } from "@/contexts/LangContext";
import { LIFE_PATH_TERMS } from "./life-path-terms";

/**
 * Finance copy intentionally describes the in-app ledger and manual review
 * process only. There is no external payment-provider onboarding in the
 * product flow.
 */
const en = {
  accountType: "Account type", details: "Details", terms: "Terms",
  payoutAccount: "Payout account", active: "Active", incomplete: "Incomplete",
  displayName: "Display name", country: "Country", termsLabel: "Terms",
  acceptedVersion: "Accepted ({{version}})", notAccepted: "Not accepted",
  simulationAccountDescription: "This beneficiary is registered for the simulated ledger and manual payout review.",
  splitTitle: "60 / 40 Split Simulation", simulatedBadge: "Simulated — no money moved",
  splitDescription: "Runs a persisted simulation payment through the backend ledger. Calculates the 60/40 split and records it as a journal entry. No real money is transferred.",
  beneficiaryRequired: "A beneficiary account is required to run simulation payments.",
  grossAmount: "Gross amount", currency: "Currency", description: "Description",
  simulationPayment: "Simulation payment", beneficiary70: "Citizen (60%)",
  platform30: "Platform (40%, including server costs)", running: "Running...", postSimulation: "Post simulation payment",
  lastSimulation: "Last simulation result", journalId: "Journal ID", beneficiary: "Beneficiary",
  platform: "Platform", duplicate: "Duplicate", yesIdempotent: "Yes (idempotent)", no: "No",
  refunding: "Refunding...", postRefund: "Post refund (ledger reversal)",
  simulationRecorded: "Simulation payment recorded", simulationRefundRecorded: "Simulation refund recorded",
  ledgerReversalCreated: "Ledger reversal created.", simulationFailed: "Simulation failed", refundFailed: "Refund failed",
  bankRedot: "Bank details & manual payouts", monthlyManual: "Monthly manual",
  settlementBank: "Settlement bank details",
  bankSecurity: "Account numbers are encrypted server-side. Only the masked form (••••XXXX) is returned to the client.",
  maskedAccount: "Account (masked)", hide: "Hide account", reveal: "Reveal masked account",
  updateBank: "Update bank details", addBank: "Add bank details",
  accountHolder: "Account holder name", legalAccountName: "Name registered on the account",
  bankName: "Bank name", accountNumber: "Account number / IBAN",
  routingCode: "Routing code / SWIFT (optional)", cancel: "Cancel", saving: "Saving...",
  saveDetails: "Save details", bankSaved: "Bank details saved",
  bankSavedDescription: "Account number encrypted server-side. Only the masked form is returned.",
  saveFailed: "Failed to save details", monthlyRequest: "Monthly manual payout request",
  period: "Period {{period}}", addBankToEnable: "Add bank details above to enable monthly requests.",
  alreadyRequested: "A manual payout request already exists for {{period}}. One request per period is allowed.",
  payoutCalculation: "The payout amount is calculated server-side from your recorded ledger allocations minus already-committed requests. Historical allocations are preserved.",
  submitting: "Submitting...", submitMonthly: "Submit monthly request", requestHistory: "Request history",
  loadingRequests: "Loading requests...", requestSubmitted: "Monthly payout request submitted",
  requestSubmittedDescription: "Your manual payout request for {{period}} is now pending admin review.",
  requestFailed: "Failed to submit payout request", saveRetry: "Failed to save. Please try again.",
  requestsUnavailable: "Manual payout requests are disabled in Simulation Mode.",
  pending: "Pending", approved: "Approved",
  rejected: "Rejected", paid: "Paid", signInRequired: "Sign in required",
  signInDescription: "You must be signed in to set up a payout account.", logIn: "Log in",
  selectAccountType: "Select the type of account you are registering.", citizen: "Citizen",
  citizenDescription: "Individual creator or player", event: "Event",
  eventDescription: "Event organizer or promoter", company: "Company",
  companyDescription: "Legal entity or business", continue: "Continue",
  legalDetails: "Legal details", legalDetailsDescription: "Enter your legal name and country.",
  legalName: "Legal name", displayNamePlaceholder: "How you appear to others",
  legalNamePlaceholder: "As it appears on your ID or business registration",
  identityNote: "Used for account records and manual payout review. Not shown publicly.",
  back: "Back", reviewTerms: "Review and accept terms",
  reviewTermsDescription: "Read the net-settlement terms carefully. You must accept them to continue.",
  acceptTerms: "I accept these terms",
  acceptConfirmation: "— I confirm I have read and understood the settlement terms above ({{version}}), including the 60/40 revenue split and simulation clause.",
  acceptContinue: "Accept and continue", offline: "Offline",
  pageTitle: "Payout Account Setup",
  pageDescription: "Register your beneficiary account and review the simulated settlement flow. No real money is moved.",
  simulationMode: "Simulation Mode",
  simulationBanner: "Ledger payments are simulated in-page. Test allocations never become real-money payout obligations.",
  offlineDescription: "You are offline. Mutations are disabled until connection is restored.",
  existingAccount: "You already have a payout account. Review its status below.",
  differentType: "Need to register a different account type? Continue below.",
  registerNew: "Register a new account", setupComplete: "Setup complete",
  completeDescription: "Your account is registered. Use the panels below to exercise the 60/40 split logic and manual payout review flow.",
  goWallet: "Go to wallet", morocco: "Morocco", france: "France", belgium: "Belgium",
  germany: "Germany", unitedKingdom: "United Kingdom", unitedStates: "United States",
  canada: "Canada", unitedArabEmirates: "United Arab Emirates",
  termsDocument: `Net-Settlement Terms — Arena Qaisypro (v{{version}})

1. Revenue split
   ${LIFE_PATH_TERMS.en.paragraphs.join("\n   ")}

2. Simulation mode
   This finance experience is permanently simulation-only. No real money is moved.
   Amounts shown in the ledger are test calculations and do not create payout obligations.

3. Manual payout review
   Beneficiaries may submit monthly manual payout requests. Each request is reviewed and
   processed by the platform according to the recorded ledger allocation and payout details.

4. Currency and timing
   Requests use the selected currency and are subject to the platform's review schedule.

5. Account records
   Bank account numbers are encrypted server-side and only the masked form is returned.
   The platform may delay or reject a request when the recorded details are incomplete.

By clicking "I accept these terms", you confirm that you have read, understood, and agree to these terms.`,
} as const;

type Key = keyof typeof en;
type Dictionary = Record<Key, string>;

// Keep every supported locale complete while providing translated labels for
// the provider-neutral finance flow. The remaining values retain the English
// legal wording so interpolation and ledger terminology stay exact.
const fr: Dictionary = Object.assign({}, en, {
  accountType: "Type de compte", details: "Informations", terms: "Conditions",
  payoutAccount: "Compte de versement", active: "Actif", incomplete: "Incomplet",
  displayName: "Nom d’affichage", country: "Pays", simulationMode: "Mode simulation",
  simulationAccountDescription: "Ce bénéficiaire est enregistré pour le grand livre simulé et l’examen manuel des versements.",
  bankRedot: "Coordonnées bancaires et versements manuels",
  monthlyRequest: "Demande mensuelle de versement manuel",
  requestSubmitted: "Demande mensuelle de versement envoyée",
  requestSubmittedDescription: "Votre demande manuelle pour {{period}} est maintenant en attente d’examen administratif.",
  requestsUnavailable: "Les demandes de versement manuel sont désactivées en mode simulation.",
  pageTitle: "Configuration du compte de versement",
  pageDescription: "Enregistrez votre compte bénéficiaire et consultez le règlement simulé. Aucun argent réel n’est déplacé.",
  simulationBanner: "Les paiements du grand livre sont simulés dans la page. Les allocations de test ne créent aucune obligation de versement réel.",
  acceptContinue: "Accepter et continuer", saveDetails: "Enregistrer les informations",
  goWallet: "Accéder au portefeuille", back: "Retour", cancel: "Annuler",
  termsDocument: `Conditions de règlement net — Arena Qaisypro (v{{version}})

1. Répartition simulée
   ${LIFE_PATH_TERMS.fr.paragraphs.join("\n   ")}

2. Mode simulation
   Cette expérience financière fonctionne exclusivement en mode simulation. Aucun argent réel n’est déplacé.
   Les montants du grand livre sont des calculs de test et ne créent aucune obligation de versement.

3. Examen manuel des versements
   Les bénéficiaires peuvent envoyer des demandes mensuelles de versement manuel, examinées par la plateforme.

En cliquant sur « J’accepte ces conditions », vous confirmez les avoir lues, comprises et acceptées.`,
}) as Dictionary;

const ar: Dictionary = Object.assign({}, en, {
  accountType: "نوع الحساب", details: "التفاصيل", terms: "الشروط",
  payoutAccount: "حساب الدفعات", active: "نشط", incomplete: "غير مكتمل",
  displayName: "اسم العرض", country: "البلد", simulationMode: "وضع المحاكاة",
  simulationAccountDescription: "تم تسجيل هذا المستفيد لدفتر الأستاذ المحاكى ومراجعة الدفعات اليدوية.",
  bankRedot: "التفاصيل البنكية والدفعات اليدوية",
  monthlyRequest: "طلب الدفعة اليدوي الشهري",
  requestSubmitted: "تم إرسال طلب الدفعة الشهري",
  requestSubmittedDescription: "طلبك اليدوي للفترة {{period}} قيد مراجعة الإدارة.",
  requestsUnavailable: "طلبات الدفعات اليدوية معطلة في وضع المحاكاة.",
  pageTitle: "إعداد حساب الدفعات",
  pageDescription: "سجّل حساب المستفيد وراجع التسوية المحاكاة. لا يتم نقل أموال حقيقية.",
  simulationBanner: "تتم محاكاة دفعات دفتر الأستاذ داخل الصفحة. لا تنشئ مخصصات الاختبار أي التزام دفع حقيقي.",
  acceptContinue: "قبول ومتابعة", saveDetails: "حفظ التفاصيل",
  goWallet: "الذهاب إلى المحفظة", back: "رجوع", cancel: "إلغاء",
  termsDocument: `شروط صافي التسوية — Arena Qaisypro (الإصدار {{version}})

1. التقسيم المحاكى
   ${LIFE_PATH_TERMS.ar.paragraphs.join("\n   ")}

2. وضع المحاكاة
   تعمل هذه التجربة المالية حصراً في وضع المحاكاة. لا يتم نقل أموال حقيقية.
   مبالغ دفتر الأستاذ حسابات اختبار ولا تنشئ أي التزام دفع.

3. مراجعة الدفعات اليدوية
   يمكن للمستفيدين إرسال طلبات دفعات يدوية شهرية تراجعها المنصة.

بالنقر على «أوافق على هذه الشروط»، تؤكد أنك قرأتها وفهمتها ووافقت عليها.`,
}) as Dictionary;

const es: Dictionary = Object.assign({}, en, {
  accountType: "Tipo de cuenta", details: "Datos", terms: "Términos",
  payoutAccount: "Cuenta de pagos", active: "Activa", incomplete: "Incompleta",
  displayName: "Nombre para mostrar", country: "País", simulationMode: "Modo de simulación",
  simulationAccountDescription: "Este beneficiario está registrado para el libro mayor simulado y la revisión manual de pagos.",
  bankRedot: "Datos bancarios y pagos manuales",
  monthlyRequest: "Solicitud mensual de pago manual",
  requestSubmitted: "Solicitud mensual enviada",
  requestSubmittedDescription: "Tu solicitud manual para {{period}} está pendiente de revisión administrativa.",
  requestsUnavailable: "Las solicitudes de pago manual están desactivadas en el modo de simulación.",
  pageTitle: "Configuración de la cuenta de pagos",
  pageDescription: "Registra tu cuenta beneficiaria y revisa la liquidación simulada. No se mueve dinero real.",
  simulationBanner: "Los pagos del libro mayor se simulan en la página. Las asignaciones de prueba no crean obligaciones de pago real.",
  acceptContinue: "Aceptar y continuar", saveDetails: "Guardar datos",
  goWallet: "Ir a la cartera", back: "Atrás", cancel: "Cancelar",
  termsDocument: `Términos de liquidación neta — Arena Qaisypro (v{{version}})

1. Reparto simulado
   ${LIFE_PATH_TERMS.es.paragraphs.join("\n   ")}

2. Modo de simulación
   Esta experiencia financiera funciona exclusivamente en modo simulación. No se mueve dinero real.
   Los importes del libro mayor son cálculos de prueba y no crean obligaciones de pago.

3. Revisión manual de pagos
   Los beneficiarios pueden enviar solicitudes mensuales de pago manual para que la plataforma las revise.

Al hacer clic en «Acepto estos términos», confirmas que los has leído, comprendido y aceptado.`,
}) as Dictionary;

const de: Dictionary = Object.assign({}, en, {
  accountType: "Kontoart", details: "Details", terms: "Bedingungen",
  payoutAccount: "Auszahlungskonto", active: "Aktiv", incomplete: "Unvollständig",
  displayName: "Anzeigename", country: "Land", simulationMode: "Simulationsmodus",
  simulationAccountDescription: "Dieser Begünstigte ist für das simulierte Hauptbuch und die manuelle Auszahlungsprüfung registriert.",
  bankRedot: "Bankverbindung und manuelle Auszahlungen",
  monthlyRequest: "Monatliche manuelle Auszahlungsanfrage",
  requestSubmitted: "Monatliche Anfrage eingereicht",
  requestSubmittedDescription: "Ihre manuelle Anfrage für {{period}} wartet nun auf die Prüfung durch den Administrator.",
  requestsUnavailable: "Manuelle Auszahlungsanfragen sind im Simulationsmodus deaktiviert.",
  pageTitle: "Einrichtung des Auszahlungskontos",
  pageDescription: "Registrieren Sie Ihr Begünstigtenkonto und prüfen Sie die simulierte Abrechnung. Es wird kein echtes Geld bewegt.",
  simulationBanner: "Ledger-Zahlungen werden auf der Seite simuliert. Testzuweisungen erzeugen keine echten Auszahlungsverpflichtungen.",
  acceptContinue: "Akzeptieren und fortfahren", saveDetails: "Angaben speichern",
  goWallet: "Zur Wallet gehen", back: "Zurück", cancel: "Abbrechen",
  termsDocument: `Nettoabrechnungsbedingungen — Arena Qaisypro (v{{version}})

1. Simulierte Aufteilung
   ${LIFE_PATH_TERMS.de.paragraphs.join("\n   ")}

2. Simulationsmodus
   Diese Finanzfunktion arbeitet ausschließlich im Simulationsmodus. Es wird kein echtes Geld bewegt.
   Ledger-Beträge sind Testberechnungen und begründen keine Auszahlungsverpflichtungen.

3. Manuelle Auszahlungsprüfung
   Begünstigte können monatliche manuelle Auszahlungsanfragen zur Prüfung durch die Plattform senden.

Mit einem Klick auf „Ich akzeptiere diese Bedingungen“ bestätigen Sie, dass Sie sie gelesen und verstanden haben.`,
}) as Dictionary;

const dictionaries: Record<Lang, Dictionary> = { en, fr, ar, es, de };

export const FINANCE_ONBOARDING_COPY = dictionaries;

export function onboardingT(lang: Lang, key: Key, values: Record<string, string | number> = {}): string {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
    dictionaries[lang][key],
  );
}

export function financeLocale(lang: Lang): string {
  return ({ en: "en-US", fr: "fr-FR", ar: "ar-MA", es: "es-ES", de: "de-DE" } as const)[lang];
}