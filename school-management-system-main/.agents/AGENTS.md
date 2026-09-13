# Project Rules & Behavioral Guidelines

## Domain & Routing Constraints

### Custom Domain Resolution in Client Routing
- **Constraint**: Do not remove or alter custom domain resolution in `client/src/App.jsx`'s `RootHandler` unless explicitly requested.
- **Context**: The application serves both a central platform (`educatechportal.com`) and individual schools via custom domains (e.g., `darulquran.com`).
- **Implementation**:
  - For `educatechportal.com` (root `/`), the app must redirect to `/login` by default.
  - For custom school domains, the app must load the school's public website via `PublicSchoolLandingPage` using the loaded school settings slug:
    ```jsx
    if (settings?.schoolSlug && !isLocalhost && settings.schoolId !== 'global-superadmin') {
      return <PublicSchoolLandingPage overrideSlug={settings.schoolSlug} />;
    }
    ```
  - Any modifications to the main routing structure must preserve this behavior to prevent breaking school custom domains.
