"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, Copy, Check } from "lucide-react";

interface RelationalAlgebraConverterProps {
  sqlQuery: string;
}

interface ParsedQuery {
  operation: string;
  tables: string[];
  columns: string[];
  conditions: string[];
  joins: Array<{
    type: string;
    table: string;
    condition: string;
  }>;
  groupBy: string[];
  orderBy: Array<{
    column: string;
    direction: string;
  }>;
  having: string[];
}

export function RelationalAlgebraConverter({
  sqlQuery,
}: RelationalAlgebraConverterProps) {
  const [relationalAlgebra, setRelationalAlgebra] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Enhanced SQL parser for basic queries
  const parseSQL = (query: string): ParsedQuery | null => {
    const trimmedQuery = query.trim();
    const upperQuery = trimmedQuery.toUpperCase();

    if (!upperQuery.startsWith("SELECT")) {
      return null;
    }

    try {
      // Extract SELECT clause - handle DISTINCT and other modifiers
      const selectMatch = trimmedQuery.match(
        /SELECT\s+(?:DISTINCT\s+)?(.+?)\s+FROM/i
      );
      if (!selectMatch) return null;

      const columnsStr = selectMatch[1];
      const columns =
        columnsStr === "*"
          ? ["*"]
          : columnsStr.split(",").map((col) => {
              const trimmed = col.trim();
              // Remove table prefixes and aliases
              return trimmed.replace(/^.*\./, "").split(/\s+/)[0];
            });

      // Extract FROM clause - handle aliases
      const fromMatch = trimmedQuery.match(
        /FROM\s+(.+?)(?:\s+WHERE|\s+JOIN|\s+GROUP\s+BY|\s+ORDER\s+BY|\s+HAVING|$)/i
      );
      if (!fromMatch) return null;

      const tablesStr = fromMatch[1];
      const tables = tablesStr.split(",").map((table) => {
        const trimmed = table.trim();
        // Extract table name (before alias)
        return trimmed.split(/\s+/)[0];
      });

      // Extract WHERE clause - handle complex conditions
      const whereMatch = trimmedQuery.match(
        /WHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+HAVING|$)/i
      );
      const conditions = whereMatch ? [whereMatch[1].trim()] : [];

      // Extract JOIN clauses - improved pattern matching
      const joinRegex =
        /(?:INNER\s+JOIN|LEFT\s+OUTER\s+JOIN|RIGHT\s+OUTER\s+JOIN|FULL\s+OUTER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|JOIN)\s+(\w+)(?:\s+\w+)?\s+ON\s+([^;]+?)(?=\s+(?:INNER\s+JOIN|LEFT\s+OUTER\s+JOIN|RIGHT\s+OUTER\s+JOIN|FULL\s+OUTER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|JOIN|WHERE|GROUP\s+BY|ORDER\s+BY|HAVING|$))/gi;
      const joinMatches = trimmedQuery.match(joinRegex);
      const joins = joinMatches
        ? joinMatches
            .map((match) => {
              const parts = match.match(
                /(?:INNER\s+JOIN|LEFT\s+OUTER\s+JOIN|RIGHT\s+OUTER\s+JOIN|FULL\s+OUTER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|JOIN)\s+(\w+)(?:\s+\w+)?\s+ON\s+(.+)/i
              );
              if (parts) {
                const type =
                  match.match(
                    /(INNER\s+JOIN|LEFT\s+OUTER\s+JOIN|RIGHT\s+OUTER\s+JOIN|FULL\s+OUTER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|JOIN)/i
                  )?.[1] || "JOIN";
                return {
                  type: type.toUpperCase(),
                  table: parts[1],
                  condition: parts[2].trim(),
                };
              }
              return null;
            })
            .filter(Boolean)
        : [];

      // Extract GROUP BY clause
      const groupByMatch = trimmedQuery.match(
        /GROUP\s+BY\s+(.+?)(?:\s+HAVING|\s+ORDER\s+BY|$)/i
      );
      const groupBy = groupByMatch
        ? groupByMatch[1].split(",").map((col) => col.trim())
        : [];

      // Extract ORDER BY clause - handle multiple columns
      const orderByMatch = trimmedQuery.match(/ORDER\s+BY\s+(.+?)(?:;|$)/i);
      const orderBy = orderByMatch
        ? orderByMatch[1].split(",").map((col) => {
            const trimmed = col.trim();
            const parts = trimmed.split(/\s+/);
            const column = parts[0];
            const direction =
              parts[1]?.toUpperCase() === "DESC" ? "DESC" : "ASC";
            return { column, direction };
          })
        : [];

      // Extract HAVING clause
      const havingMatch = trimmedQuery.match(
        /HAVING\s+(.+?)(?:\s+ORDER\s+BY|$)/i
      );
      const having = havingMatch ? [havingMatch[1].trim()] : [];

      return {
        operation: "SELECT",
        tables,
        columns,
        conditions,
        joins,
        groupBy,
        orderBy,
        having,
      };
    } catch (err) {
      return null;
    }
  };

  // Convert parsed query to relational algebra
  const convertToRelationalAlgebra = (parsed: ParsedQuery): string => {
    let result = "";

    // Start with the main table(s)
    if (parsed.tables.length === 1) {
      result = parsed.tables[0];
    } else {
      result = `(${parsed.tables.join(" × ")})`;
    }

    // Apply joins
    for (const join of parsed.joins) {
      const joinSymbol =
        join.type === "LEFT JOIN" || join.type === "LEFT OUTER JOIN"
          ? "⟕"
          : join.type === "RIGHT JOIN" || join.type === "RIGHT OUTER JOIN"
          ? "⟖"
          : join.type === "FULL JOIN" || join.type === "FULL OUTER JOIN"
          ? "⟗"
          : "⋈";

      // Handle join conditions
      const joinCondition = join.condition
        .replace(/=/g, "=")
        .replace(/\s+/g, " ");
      result = `(${result} ${joinSymbol}[${joinCondition}] ${join.table})`;
    }

    // Apply selection (WHERE conditions) - handle multiple conditions
    if (parsed.conditions.length > 0) {
      const conditionsStr = parsed.conditions.join(" ∧ ");
      result = `σ[${conditionsStr}](${result})`;
    }

    // Apply grouping first (if present)
    if (parsed.groupBy.length > 0) {
      const groupByStr = parsed.groupBy.join(", ");
      result = `γ[${groupByStr}](${result})`;
    }

    // Apply having (after grouping)
    if (parsed.having.length > 0) {
      const havingStr = parsed.having.join(" ∧ ");
      result = `σ[${havingStr}](${result})`;
    }

    // Apply projection (SELECT columns) - after grouping and having
    if (parsed.columns.length > 0 && !parsed.columns.includes("*")) {
      const columnsStr = parsed.columns.join(", ");
      result = `π[${columnsStr}](${result})`;
    }

    // Apply ordering (this is typically not part of relational algebra, but we'll show it)
    if (parsed.orderBy.length > 0) {
      const orderByStr = parsed.orderBy
        .map((ob) => `${ob.column} ${ob.direction}`)
        .join(", ");
      result = `τ[${orderByStr}](${result})`;
    }

    return result;
  };

  useEffect(() => {
    if (!sqlQuery.trim()) {
      setRelationalAlgebra("");
      setError(null);
      return;
    }

    const parsed = parseSQL(sqlQuery);
    if (!parsed) {
      setError(
        "Unable to parse SQL query. Please ensure it's a valid SELECT statement."
      );
      setRelationalAlgebra("");
      return;
    }

    try {
      const ra = convertToRelationalAlgebra(parsed);
      setRelationalAlgebra(ra);
      setError(null);
    } catch (err) {
      setError("Error converting to relational algebra");
      setRelationalAlgebra("");
    }
  }, [sqlQuery]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(relationalAlgebra);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Relational Algebra Converter
        </CardTitle>
        <CardDescription>
          Converts SQL queries to relational algebra notation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {relationalAlgebra && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Relational Algebra Expression:
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-md">
              <code className="text-sm font-mono break-all">
                {relationalAlgebra}
              </code>
            </div>

            <div className="text-xs text-muted-foreground space-y-2">
              <div>
                <p>
                  <strong>Symbols:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>σ[condition] - Selection (WHERE)</li>
                  <li>π[columns] - Projection (SELECT)</li>
                  <li>⋈ - Natural join</li>
                  <li>⟕ - Left outer join</li>
                  <li>⟖ - Right outer join</li>
                  <li>⟗ - Full outer join</li>
                  <li>× - Cartesian product</li>
                  <li>γ[columns] - Grouping (GROUP BY)</li>
                  <li>τ[columns] - Sorting (ORDER BY)</li>
                </ul>
              </div>
              <div>
                <p>
                  <strong>Example Queries:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <code>
                      SELECT Name, Salary FROM EMPLOYEE WHERE Department = 'IT'
                    </code>
                  </li>
                  <li>
                    <code>
                      SELECT e.Name, d.DepartmentName FROM EMPLOYEE e JOIN
                      DEPARTMENT d ON e.DepartmentID = d.ID
                    </code>
                  </li>
                  <li>
                    <code>
                      SELECT Department, COUNT(*) FROM EMPLOYEE GROUP BY
                      Department
                    </code>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {!relationalAlgebra && !error && sqlQuery.trim() && (
          <div className="text-muted-foreground text-sm">
            Enter a SQL query to see its relational algebra equivalent
          </div>
        )}
      </CardContent>
    </Card>
  );
}
