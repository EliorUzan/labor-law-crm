import {
  boolean,
  date,
  foreignKey,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const clientStatus = pgEnum("client_status", ["potential", "active", "former"]);
export const financialRecordType = pgEnum("financial_record_type", [
  "fee",
  "charge",
  "payment",
]);

function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  };
}

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    status: clientStatus("status"),
    ...timestamps(),
  },
  (table) => [
    unique("clients_owner_user_id_id_unique").on(table.ownerUserId, table.id),
    index("clients_owner_user_id_idx").on(table.ownerUserId),
  ],
);

export const matters = pgTable(
  "matters",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    clientId: uuid("client_id").notNull(),
    title: text("title").notNull(),
    caseType: text("case_type"),
    status: text("status"),
    openDate: date("open_date"),
    caseNumber: text("case_number"),
    courtOrTribunal: text("court_or_tribunal"),
    opposingParty: text("opposing_party"),
    opposingAttorneyName: text("opposing_attorney_name"),
    opposingAttorneyPhone: text("opposing_attorney_phone"),
    opposingAttorneyEmail: text("opposing_attorney_email"),
    opposingAttorneyFirm: text("opposing_attorney_firm"),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "matters_owner_user_id_client_id_clients_owner_user_id_id_fk",
      columns: [table.ownerUserId, table.clientId],
      foreignColumns: [clients.ownerUserId, clients.id],
    }).onDelete("restrict"),
    unique("matters_owner_user_id_id_unique").on(table.ownerUserId, table.id),
    unique("matters_owner_user_id_client_id_id_unique").on(
      table.ownerUserId,
      table.clientId,
      table.id,
    ),
    index("matters_owner_user_id_idx").on(table.ownerUserId),
    index("matters_owner_user_id_client_id_idx").on(table.ownerUserId, table.clientId),
  ],
);

export const matterNotes = pgTable(
  "matter_notes",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    content: text("content").notNull(),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "matter_notes_owner_user_id_matter_id_matters_owner_user_id_id_fk",
      columns: [table.ownerUserId, table.matterId],
      foreignColumns: [matters.ownerUserId, matters.id],
    }).onDelete("restrict"),
    index("matter_notes_owner_user_id_matter_id_created_at_idx").on(
      table.ownerUserId,
      table.matterId,
      table.createdAt,
    ),
  ],
);

export const clientObligations = pgTable(
  "client_obligations",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    clientId: uuid("client_id").notNull(),
    matterId: uuid("matter_id"),
    title: text("title").notNull(),
    description: text("description"),
    done: boolean("done").notNull().default(false),
    dueDate: date("due_date"),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "client_obligations_owner_user_id_client_id_clients_owner_user_id_id_fk",
      columns: [table.ownerUserId, table.clientId],
      foreignColumns: [clients.ownerUserId, clients.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "client_obligations_owner_user_id_client_id_matter_id_matters_fk",
      columns: [table.ownerUserId, table.clientId, table.matterId],
      foreignColumns: [matters.ownerUserId, matters.clientId, matters.id],
    }).onDelete("restrict"),
    index("client_obligations_owner_user_id_client_id_idx").on(table.ownerUserId, table.clientId),
    index("client_obligations_owner_user_id_done_due_date_idx").on(
      table.ownerUserId,
      table.done,
      table.dueDate,
    ),
  ],
);

export const financialRecords = pgTable(
  "financial_records",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    clientId: uuid("client_id").notNull(),
    matterId: uuid("matter_id"),
    type: financialRecordType("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    recordDate: date("record_date").notNull(),
    description: text("description"),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "financial_records_owner_user_id_client_id_clients_owner_user_id_id_fk",
      columns: [table.ownerUserId, table.clientId],
      foreignColumns: [clients.ownerUserId, clients.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "financial_records_owner_user_id_client_id_matter_id_matters_fk",
      columns: [table.ownerUserId, table.clientId, table.matterId],
      foreignColumns: [matters.ownerUserId, matters.clientId, matters.id],
    }).onDelete("restrict"),
    index("financial_records_owner_user_id_client_id_record_date_idx").on(
      table.ownerUserId,
      table.clientId,
      table.recordDate,
    ),
  ],
);

export const deadlines = pgTable(
  "deadlines",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    title: text("title").notNull(),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    description: text("description"),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "deadlines_owner_user_id_matter_id_matters_owner_user_id_id_fk",
      columns: [table.ownerUserId, table.matterId],
      foreignColumns: [matters.ownerUserId, matters.id],
    }).onDelete("restrict"),
    unique("deadlines_owner_user_id_matter_id_id_unique").on(
      table.ownerUserId,
      table.matterId,
      table.id,
    ),
    index("deadlines_owner_user_id_deadline_at_idx").on(table.ownerUserId, table.deadlineAt),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    deadlineId: uuid("deadline_id"),
    title: text("title").notNull(),
    description: text("description"),
    done: boolean("done").notNull().default(false),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "tasks_owner_user_id_matter_id_matters_owner_user_id_id_fk",
      columns: [table.ownerUserId, table.matterId],
      foreignColumns: [matters.ownerUserId, matters.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "tasks_owner_user_id_matter_id_deadline_id_deadlines_fk",
      columns: [table.ownerUserId, table.matterId, table.deadlineId],
      foreignColumns: [deadlines.ownerUserId, deadlines.matterId, deadlines.id],
    }).onDelete("restrict"),
    index("tasks_owner_user_id_done_idx").on(table.ownerUserId, table.done),
    index("tasks_owner_user_id_matter_id_idx").on(table.ownerUserId, table.matterId),
  ],
);

export const importantDates = pgTable(
  "important_dates",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    title: text("title").notNull(),
    eventAt: timestamp("event_at", { withTimezone: true }).notNull(),
    type: text("type"),
    description: text("description"),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "important_dates_owner_user_id_matter_id_matters_owner_user_id_id_fk",
      columns: [table.ownerUserId, table.matterId],
      foreignColumns: [matters.ownerUserId, matters.id],
    }).onDelete("restrict"),
    index("important_dates_owner_user_id_event_at_idx").on(table.ownerUserId, table.eventAt),
  ],
);

export const matterHistory = pgTable(
  "matter_history",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    eventDate: date("event_date").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "matter_history_owner_user_id_matter_id_matters_owner_user_id_id_fk",
      columns: [table.ownerUserId, table.matterId],
      foreignColumns: [matters.ownerUserId, matters.id],
    }).onDelete("restrict"),
    index("matter_history_owner_user_id_matter_id_event_date_idx").on(
      table.ownerUserId,
      table.matterId,
      table.eventDate,
    ),
  ],
);

export const documentReferences = pgTable(
  "document_references",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    displayName: text("display_name").notNull(),
    location: text("location").notNull(),
    category: text("category"),
    notes: text("notes"),
    provider: text("provider"),
    externalId: text("external_id"),
    ...timestamps(),
  },
  (table) => [
    foreignKey({
      name: "document_references_owner_user_id_matter_id_matters_owner_user_id_id_fk",
      columns: [table.ownerUserId, table.matterId],
      foreignColumns: [matters.ownerUserId, matters.id],
    }).onDelete("restrict"),
    index("document_references_owner_user_id_matter_id_idx").on(table.ownerUserId, table.matterId),
  ],
);

export const accountingRecords = pgTable(
  "accounting_records",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    type: text("type").notNull(),
    recordDate: date("record_date").notNull(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }),
    documentLink: text("document_link"),
    notes: text("notes"),
    ...timestamps(),
  },
  (table) => [
    index("accounting_records_owner_user_id_record_date_idx").on(table.ownerUserId, table.recordDate),
  ],
);
