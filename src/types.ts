// Shared types for the Campaign Machine demo.

// Zapier action types (the SDK also supports read_bulk / search_or_write / etc.,
// but read | write | search are the three you use 99% of the time).
export type ActionType = "read" | "write" | "search";

export interface ProductRow {
  row_id: string;
  product: string;
  description: string;
  audience: string;
  image_url: string;
  link: string;
  status: string; // "new" | "scheduled" | "published"
}

export interface Copy {
  linkedin: string;
  x_thread: string[];
  email_subject: string;
  email_body: string;
}
