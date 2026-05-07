export default (initialState: { currentUser?: Global.UserInfo }) => {
  const isPlatformAdmin = !!(
    initialState &&
    initialState.currentUser &&
    initialState.currentUser.is_admin
  );
  // canSeeUser gates user-facing pages (My Models, Usage, etc).
  // Computed lazily below — needs the Org context to also surface them
  // for admin acting-as inside their Personal Org.

  // Resolve current Org context from localStorage. Org list / current id
  // are persisted by app.tsx so the access plugin (which runs outside of
  // React) can read them. Menu visibility refreshes on the next render
  // after the user switches Orgs.
  const readCurrentOrgContext = (): {
    isPersonal: boolean;
    role: string | null;
    inAllMode: boolean;
  } => {
    if (typeof window === 'undefined') {
      return { isPersonal: false, role: null, inAllMode: true };
    }
    try {
      const idRaw = window.localStorage.getItem('currentOrganizationId');
      const listRaw = window.localStorage.getItem('organizationList');
      const id = idRaw ? JSON.parse(idRaw) : null;
      const list = listRaw ? JSON.parse(listRaw) : [];
      if (id == null) {
        return { isPersonal: false, role: null, inAllMode: true };
      }
      if (!Array.isArray(list)) {
        return { isPersonal: false, role: null, inAllMode: false };
      }
      const current = list.find((o: any) => o.id === id);
      return {
        isPersonal: !!current?.is_personal,
        role: current?.role ?? null,
        inAllMode: false
      };
    } catch {
      return { isPersonal: false, role: null, inAllMode: false };
    }
  };

  const ctx = readCurrentOrgContext();
  const isOrgAdminHere = ctx.role === 'admin';

  // Personal Org is a private workspace — admin / management menus hide
  // while switched into it. Switch back to a team Org (or "All" mode for
  // platform admin) to expose them again.
  const canSeeAdmin = isPlatformAdmin && !ctx.isPersonal;

  // "Manage Org-scoped resources" gate. Covers Models management
  // (Deployments / Catalog / Routes / Providers / Benchmark), Resources
  // (Workers / GPUs / ModelFiles), Cluster Management, and Access Control.
  // Visible when the caller has authority in the current context:
  //   - Platform admin in "All" mode or a team Org → yes
  //   - Org admin in a non-Personal Org → yes
  //   - Anyone in a Personal Org → no
  //   - Regular user → no
  const canManageInfra = !ctx.isPersonal && (isPlatformAdmin || isOrgAdminHere);

  // User-facing pages (My Models) only show when the management view
  // isn't available — anyone who can see Deployments doesn't need the
  // separate "My Models" catalog entry.
  const canSeeUser = !canManageInfra;

  // Members management is per-Org by nature — there is no meaningful
  // "All" view, so the menu hides when platform admin hasn't picked an
  // Org yet. Switching to any team Org reveals it.
  const canManageOrgMembers = canManageInfra && !ctx.inAllMode;

  return {
    canSeeAdmin,
    canSeeUser,
    canManageInfra,
    canManageOrgMembers,
    canDelete: true,
    canLogin: true
  };
};
