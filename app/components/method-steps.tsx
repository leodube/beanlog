import { WEIGHTED_ACTIONS, type RecipeStep } from "~/lib/domain";
import { ACTION_LABELS, isScaled, mmss, scaledTarget } from "~/lib/recipe";

/**
 * A recipe's method as a list. With `scale`, targets are shown scaled to a
 * brew (bloom by dose, pours by water) with the recipe's original struck through.
 */
export function MethodSteps({
  steps,
  scale,
}: {
  steps: RecipeStep[];
  scale?: { dose: number; water: number };
}) {
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => {
        const weighted = WEIGHTED_ACTIONS.has(s.action) && s.targetG != null;
        const target = weighted
          ? scale
            ? scaledTarget(s, scale)
            : s.targetG
          : null;
        const changed =
          scale &&
          weighted &&
          isScaled(s.action === "bloom" ? scale.dose : scale.water) &&
          target !== s.targetG;
        return (
          <li
            key={i}
            className="grid grid-cols-[3rem_1fr_auto] gap-2 border-t border-line py-2 text-sm tabular-nums first:border-t-0"
          >
            <span className="font-semibold text-accent">{mmss(s.at)}</span>
            <span>
              {ACTION_LABELS[s.action]}
              {s.note && <span className="text-muted"> · {s.note}</span>}
            </span>
            <span>
              {weighted && (
                <>
                  to {target} g
                  {changed && (
                    <span className="ml-1 text-xs text-muted line-through">
                      {s.targetG}
                    </span>
                  )}
                </>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
