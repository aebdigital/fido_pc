
// ============================================================================
// iOS-COMPATIBLE CONSTANTS
// These match the iOS app's enum values for consistency across platforms
// ============================================================================

// Project Status - matches iOS ProjectStatus enum
// iOS stores as Int64: 0=notSent, 1=sent, 2=approved, 3=finished
export const PROJECT_STATUS = {
  NOT_SENT: 0,
  SENT: 1,
  APPROVED: 2,
  FINISHED: 3
};

// Project Events - matches iOS ProjectEvents enum (rawValue strings)
// Used for history events
export const PROJECT_EVENTS = {
  CREATED: 'created',
  NOT_SENT: 'notSent',
  SENT: 'sent',
  APPROVED: 'approved',
  ARCHIVED: 'archived',
  UNARCHIVED: 'unArchived',
  DUPLICATED: 'duplicated',
  INVOICE_SENT: 'invoiceSent',
  INVOICE_GENERATED: 'invoiceGenerated',
  FINISHED: 'finished',
  INVOICE_DELETED: 'invoiceDeleted'
};

// Invoice Status - matches iOS InvoiceStatus enum
// iOS uses: paid, unpaid, afterMaturity
// Database uses: paid, unsent, overdue (mapped via statusToDatabase/statusFromDatabase in iOS)
export const INVOICE_STATUS = {
  // App-side values (iOS compatible)
  UNPAID: 'unpaid',
  PAID: 'paid',
  AFTER_MATURITY: 'afterMaturity'
};

// Map iOS invoice status to database status
export const invoiceStatusToDatabase = (iosStatus) => {
  switch (iosStatus) {
    case 'unpaid': return 'unsent';
    case 'afterMaturity': return 'overdue';
    case 'paid': return 'paid';
    default: return iosStatus;
  }
};

// Map database invoice status to iOS status
export const invoiceStatusFromDatabase = (dbStatus) => {
  switch (dbStatus) {
    case 'unsent': return 'unpaid';
    case 'overdue': return 'afterMaturity';
    case 'paid': return 'paid';
    default: return dbStatus;
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper to format project number the iOS way: year + 3-digit sequential number
// iOS stores only the sequential number (1, 2, 3...) in `number` field
// and computes projectNumber as year from dateCreated + padded number
// e.g., number=3, dateCreated=2026 -> "2026003"
export const formatProjectNumber = (project) => {
  if (!project) return '';

  const number = parseInt(project.number || 0);

  // If number is already in year+sequence format (legacy), return as is
  // Legacy format: 2026001, 2026002, etc. (7 digits starting with 202x)
  if (number >= 2020000 && number <= 2099999) {
    return String(number);
  }

  // iOS format: just the sequential number (1, 2, 3...)
  // Compute display as year + 3-digit padded number
  const createdDate = project.createdDate ? new Date(project.createdDate) : new Date();
  const year = createdDate.getFullYear();
  const paddedNumber = String(number).padStart(3, '0');

  return `${year}${paddedNumber}`;
};

// Helper to transform invoice from database format to app format
export const transformInvoiceFromDB = (dbInvoice) => {
  if (!dbInvoice) return null;

  // Determine Issue Date (Datum vystavenia) - prefer date_created, fallback to created_at
  const issueDateRaw = dbInvoice.date_created || dbInvoice.created_at;
  const issueDate = issueDateRaw ? new Date(issueDateRaw).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  // Determine Dispatch Date (Datum dodania) - use date_of_dispatch
  const dispatchDate = dbInvoice.date_of_dispatch || issueDate;

  // Calculate Maturity Date (Datum splatnosti) based on Issue Date + Maturity Days
  const maturityDays = dbInvoice.maturity_days || 14;
  const dueDate = new Date(new Date(issueDate).getTime() + maturityDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return {
    id: dbInvoice.id,
    invoiceNumber: dbInvoice.number,
    issueDate: issueDate,
    dispatchDate: dispatchDate, // New field
    dueDate: dueDate,
    paymentMethod: dbInvoice.payment_type,
    paymentDays: maturityDays,
    notes: dbInvoice.note,
    status: invoiceStatusFromDatabase(dbInvoice.status), // Convert DB status to iOS-compatible status
    projectId: dbInvoice.project_id,
    projectName: dbInvoice.projects?.name || '',
    categoryId: dbInvoice.projects?.category || '',
    clientId: dbInvoice.client_id,
    contractorId: dbInvoice.contractor_id || dbInvoice.c_id,
    createdDate: dbInvoice.created_at
  };
};

// Helper to transform contractor from DB (snake_case) to App (camelCase)
export const transformContractorFromDB = (dbContractor) => {
  if (!dbContractor) return null;
  return {
    id: dbContractor.id,
    name: dbContractor.name,
    contactPerson: dbContractor.contact_person_name,
    email: dbContractor.email,
    phone: dbContractor.phone,
    website: dbContractor.web,
    street: dbContractor.street,
    additionalInfo: dbContractor.second_row_street,
    city: dbContractor.city,
    postalCode: dbContractor.postal_code,
    country: dbContractor.country,
    businessId: dbContractor.business_id,
    taxId: dbContractor.tax_id,
    vatNumber: dbContractor.vat_registration_number,
    bankAccount: dbContractor.bank_account_number,
    bankCode: dbContractor.swift_code, // Using swift_code for bank code/SWIFT
    legalAppendix: dbContractor.legal_notice,
    logo: dbContractor.logo_url,
    signature: dbContractor.signature_url,
    price_offer_settings: dbContractor.price_offer_settings
  };
};

// Helper to transform contractor from App (camelCase) to DB (snake_case)
export const transformContractorToDB = (contractorData) => {
  return {
    name: contractorData.name,
    contact_person_name: contractorData.contactPerson,
    email: contractorData.email,
    phone: contractorData.phone,
    web: contractorData.website,
    street: contractorData.street,
    second_row_street: contractorData.additionalInfo,
    city: contractorData.city,
    postal_code: contractorData.postalCode,
    country: contractorData.country,
    business_id: contractorData.businessId,
    tax_id: contractorData.taxId,
    vat_registration_number: contractorData.vatNumber,
    bank_account_number: contractorData.bankAccount,
    swift_code: contractorData.bankCode,
    legal_notice: contractorData.legalAppendix,
    logo_url: contractorData.logo,
    signature_url: contractorData.signature
  };
};

// Normalize client type to iOS values (personal/corporation)
// Desktop used to use private/business, iOS uses personal/corporation
const normalizeClientType = (type) => {
  if (type === 'private' || type === 'personal') return 'personal';
  if (type === 'business' || type === 'corporation') return 'corporation';
  return 'personal';
};

// Helper to transform client from DB (snake_case) to App (camelCase)
export const transformClientFromDB = (dbClient) => {
  if (!dbClient) return null;
  return {
    id: dbClient.id,
    name: dbClient.name,
    email: dbClient.email,
    phone: dbClient.phone,
    street: dbClient.street,
    additionalInfo: dbClient.second_row_street,
    city: dbClient.city,
    postalCode: dbClient.postal_code,
    country: dbClient.country,
    businessId: dbClient.business_id,
    taxId: dbClient.tax_id,
    vatId: dbClient.vat_registration_number,
    contactPerson: dbClient.contact_person_name,
    type: normalizeClientType(dbClient.type),
    contractorId: dbClient.contractor_id || dbClient.c_id,
    userId: dbClient.user_id,
    createdAt: dbClient.created_at,
    projects: dbClient.projects || [] // Preserve if joined
  };
};

// Helper to transform client from App (camelCase) to DB (snake_case)
export const transformClientToDB = (clientData) => {
  return {
    name: clientData.name,
    email: clientData.email || null,
    phone: clientData.phone || null,
    street: clientData.street || null,
    second_row_street: clientData.additionalInfo || null,
    city: clientData.city || null,
    postal_code: clientData.postalCode || null,
    country: clientData.country || null,
    business_id: clientData.businessId || null,
    tax_id: clientData.taxId || null,
    vat_registration_number: clientData.vatId || null,
    contact_person_name: clientData.contactPerson || null,
    type: normalizeClientType(clientData.type) // Use iOS values: personal/corporation
  };
};
