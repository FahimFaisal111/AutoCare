/*Comment : Shared helper for everything packed into APPOINTMENT's one service_description TEXT column - no new table/column exists or is being added, per the 11/12-table budget. Three different things now share this one field: the customer's original request (written at booking time), the mechanic's narrative write-up, and the itemized parts list (Hero Feature 6). Bug this fixes: the mechanic's save used to overwrite the customer's note entirely, since both were just writing raw text into the same column. Now all three are kept as separate, clearly-marked sections within that one string, and buildServiceDescription always carries the customer's original request forward untouched - the mechanic can add to the field, never erase what the customer wrote. */

export interface PartLine {
  name: string;
  cost: number;
}

export interface ParsedServiceLog {
  customerRequest: string;
  narrative: string;
  parts: PartLine[];
}

const CUSTOMER_REQUEST_MARKER = "Customer Request:";
const WORK_LOG_MARKER = "Mechanic's Notes:";
const PARTS_MARKER = "Parts Replaced:";

/*Comment : Combines all three pieces into the one string that actually gets stored. customerRequest should always be whatever was already on the appointment (parsed back out via parseServiceDescription) - callers must pass it through unchanged, not leave it blank, or the customer's note is lost exactly the way this fix is meant to prevent. Empty sections are omitted rather than written out blank, so an appointment with no customer note doesn't end up with a dangling "Customer Request:" header. */
export function buildServiceDescription(customerRequest: string, narrative: string, parts: PartLine[]): string {
  const trimmedRequest = (customerRequest || "").trim();
  const trimmedNarrative = (narrative || "").trim();
  const validParts = parts.filter((p) => p.name.trim().length > 0 && p.cost > 0);

  const workLogPieces: string[] = [];
  if (trimmedNarrative) {
    workLogPieces.push(trimmedNarrative);
  }
  if (validParts.length > 0) {
    workLogPieces.push(
      [PARTS_MARKER, ...validParts.map((p) => `- ${p.name.trim()} | ${p.cost.toFixed(2)}`)].join("\n")
    );
  }
  const workLogBody = workLogPieces.join("\n\n");

  const sections: string[] = [];
  if (trimmedRequest) {
    sections.push(`${CUSTOMER_REQUEST_MARKER}\n${trimmedRequest}`);
  }
  if (workLogBody) {
    sections.push(`${WORK_LOG_MARKER}\n${workLogBody}`);
  }

  return sections.join("\n\n");
}

/*Comment : The reverse of buildServiceDescription. Backward-compatible on purpose: a record saved before this fix existed (or before the parts-list feature existed) has neither marker at all - in that case the whole string is treated as work-log content, exactly how it used to be read, so nothing already in the database breaks or gets misparsed. */
export function parseServiceDescription(raw: string | undefined | null): ParsedServiceLog {
  if (!raw) {
    return { customerRequest: "", narrative: "", parts: [] };
  }

  const requestIndex = raw.indexOf(CUSTOMER_REQUEST_MARKER);
  const workLogIndex = raw.indexOf(WORK_LOG_MARKER);

  let customerRequest = "";
  let workLogText: string;

  if (requestIndex !== -1) {
    const requestEnd = workLogIndex !== -1 ? workLogIndex : raw.length;
    customerRequest = raw.slice(requestIndex + CUSTOMER_REQUEST_MARKER.length, requestEnd).trim();
    workLogText = workLogIndex !== -1 ? raw.slice(workLogIndex + WORK_LOG_MARKER.length) : "";
  } else if (workLogIndex !== -1) {
    workLogText = raw.slice(workLogIndex + WORK_LOG_MARKER.length);
  } else {
    // No markers at all - a legacy record from before this fix. Treat the
    // whole thing as work-log content, same as parseServiceDescription
    // always has, so old data keeps reading exactly as it used to.
    workLogText = raw;
  }

  const partsMarkerIndex = workLogText.indexOf(PARTS_MARKER);
  let narrative: string;
  let parts: PartLine[];

  if (partsMarkerIndex === -1) {
    narrative = workLogText.trim();
    parts = [];
  } else {
    narrative = workLogText.slice(0, partsMarkerIndex).trim();
    const partsSection = workLogText.slice(partsMarkerIndex + PARTS_MARKER.length);
    parts = partsSection
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- "))
      .map((line) => {
        const body = line.slice(2);
        const separatorIndex = body.lastIndexOf("|");
        if (separatorIndex === -1) {
          return { name: body.trim(), cost: 0 };
        }
        const name = body.slice(0, separatorIndex).trim();
        const cost = parseFloat(body.slice(separatorIndex + 1).trim());
        return { name, cost: Number.isFinite(cost) ? cost : 0 };
      })
      .filter((p) => p.name.length > 0);
  }

  return { customerRequest, narrative, parts };
}

/*Comment : Sum of a parts list's costs - unchanged, still what gets sent to the backend as partsCost. */
export function sumParts(parts: PartLine[]): number {
  return parts.reduce((total, p) => total + (Number.isFinite(p.cost) ? p.cost : 0), 0);
}
