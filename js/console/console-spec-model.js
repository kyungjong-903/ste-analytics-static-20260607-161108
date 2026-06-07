(function (global) {
  "use strict";

  const D = () => global.STEData;

  function context(state) {
    const data = D();
    const ent = data.byId(state.entId);
    const channel = state.channel || null;
    const period = state.period || "ytd";
    return {
      entity: ent,
      mode: state.mode,
      year: state.year || "2026",
      period,
      season: state.season || "all",
      axis: state.axis || "calendar",
      view: state.view || "actual",
      channel,
      label: data.closeLabel ? data.closeLabel(period) : period.toUpperCase(),
    };
  }

  function base(state) {
    const data = D();
    const ctx = context(state);
    if (data.setContext) {
      data.setContext({
        season: ctx.axis === "season" ? ctx.season : "all",
        year: ctx.year,
        view: ctx.view,
        axis: ctx.axis,
      });
    }
    const sales = data.salesFor(ctx.entity.id, ctx.period, ctx.channel);
    return { ctx, sales };
  }

  function overview(state) {
    const { ctx, sales } = base(state);
    return { ctx, sales };
  }

  function distribution(state) {
    const { ctx, sales } = base(state);
    const dist = D().distributionFor(ctx.entity.id, ctx.period);
    return { ctx, sales, dist };
  }

  function inventory(state) {
    const { ctx, sales } = base(state);
    const inv = D().inventoryFor(ctx.entity.id, ctx.period);
    return { ctx, sales, inv };
  }

  function marketing(state) {
    const { ctx, sales } = base(state);
    const mkt = D().marketingFor(ctx.entity.id, ctx.period);
    return { ctx, sales, mkt };
  }

  global.STESpecModel = { context, overview, distribution, inventory, marketing };
})(window);
