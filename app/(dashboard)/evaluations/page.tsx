import { PageHeader, Button, Table, Th, Td, Mono, Badge } from "@/components/ui/primitives";
import { SamAIClient } from "@/lib/samai/client";
import { formatCost, formatMs, timeAgo } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function EvaluationsPage() {
  const evaluations = await SamAIClient.listEvaluations();
  return (
    <div>
      <PageHeader
        title="Evaluations"
        subtitle="Regression-tested accuracy, safety, and tool selection per agent version."
        actions={
          <Button>
            <Plus size={14} /> Create Evaluation
          </Button>
        }
      />
      <Table>
        <thead>
          <tr>
            <Th>Evaluation</Th>
            <Th>Agent</Th>
            <Th>Dataset</Th>
            <Th>Pass Rate</Th>
            <Th>Failed Cases</Th>
            <Th>Regression</Th>
            <Th>Latency</Th>
            <Th>Cost</Th>
            <Th>Run</Th>
          </tr>
        </thead>
        <tbody>
          {evaluations.map((e) => (
            <tr key={e.id}>
              <Td className="font-medium">{e.name}</Td>
              <Td>{e.agentName}</Td>
              <Td><Mono className="text-ink-dim">{e.dataset}</Mono></Td>
              <Td>{e.passRate}%</Td>
              <Td>{e.failedCases}</Td>
              <Td>
                <Badge className={e.regression < 0 ? "border-err/40 text-err" : "border-ok/40 text-ok"}>
                  {e.regression > 0 ? "+" : ""}
                  {e.regression}%
                </Badge>
              </Td>
              <Td>{formatMs(e.avgLatencyMs)}</Td>
              <Td>{formatCost(e.tokenCost)}</Td>
              <Td className="text-ink-dim">{timeAgo(e.runAt)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
