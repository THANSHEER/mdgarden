# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in mdgarden, please email **thansheerbhr@gmail.com** with:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** and severity
4. **Your contact information** (optional)

Please **do not** open a public GitHub issue for security vulnerabilities. We aim to respond to security reports within 48 hours.

## Security Practices

### Dependencies

- We use **Dependabot** to automatically check for vulnerable dependencies
- Security updates are prioritized and deployed rapidly
- All dependencies are regularly audited using `npm audit`

### Code Security

- **TypeScript strict mode** is enforced for type safety
- **CodeQL analysis** runs on every push and PR to detect potential security issues
- All code changes undergo review before merging
- The project uses **OIDC Trusted Publishing** for npm releases (no secrets stored)

### Build Security

- Binaries are built using **Node SEA** (Single Executable Applications)
- Build jobs run in isolated GitHub-hosted runners
- Artifacts are signed and verified before release
- The project follows **principle of least privilege** in CI/CD permissions

### Supported Versions

| Version | Status             | Security Updates |
| ------- | ------------------ | ---------------- |
| 0.5.x   | Current            | ✅ Yes           |
| 0.4.x   | Maintenance        | ✅ Yes           |
| < 0.4   | End of Life        | ❌ No            |

## Security Features

### Runtime

- No eval() or dynamic code execution
- Strict Content Security Policy (CSP) compatible
- No external network requests from bundled assets
- XSS-safe markdown parsing with sanitization

### Development

- No hardcoded secrets in repository
- Git hooks prevent accidental secret commits
- Environment variables validated at startup
- Build artifacts are deterministic where possible

## Best Practices for Users

1. **Keep mdgarden updated** to the latest version
2. **Review configuration** - don't expose sensitive data in markdown files
3. **Audit third-party themes** before using them
4. **Run on a server** with appropriate firewall rules
5. **Use HTTPS** when serving your digital garden

## Compliance

- MIT License - no warranty provided
- No telemetry or data collection
- All code is open-source and auditable
- Zero tracking of user activity

---

For more information, see [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md).
