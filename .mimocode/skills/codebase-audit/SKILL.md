---
name: codebase-audit
description: Systematically analyze a codebase to understand architecture, identify issues, and document findings. Use when starting work on an unfamiliar project.
---

# Codebase Audit Skill

Perform a comprehensive analysis of a codebase to understand its structure, architecture, and potential issues.

## When to Use

- Starting work on a new or unfamiliar project
- Investigating bugs or unexpected behavior
- Planning refactoring or feature additions
- Documenting project architecture for team members

## Procedure

### Phase 1: Structure Discovery
1. **Directory Overview**
   - List top-level files and directories
   - Identify project type (React, Node.js, Python, etc.)
   - Find configuration files (package.json, tsconfig, etc.)

2. **Dependency Analysis**
   - Read package.json / requirements.txt
   - Identify key dependencies and versions
   - Check for outdated or vulnerable packages

3. **Entry Points**
   - Find main entry files (index.js, main.tsx, App.jsx, etc.)
   - Trace import chains to understand module structure

### Phase 2: Architecture Analysis
1. **Component/Module Structure**
   - Map out major components or modules
   - Identify data flow patterns
   - Document state management approach

2. **API/Route Mapping**
   - List API endpoints or routes
   - Understand request/response patterns
   - Check authentication/authorization

3. **Data Flow**
   - Trace how data moves through the application
   - Identify stores, contexts, or databases
   - Document external service integrations

### Phase 3: Quality Assessment
1. **Code Quality**
   - Check for code smells (long functions, deep nesting)
   - Identify duplicated code
   - Review error handling patterns

2. **Testing Coverage**
   - Find test files and test directories
   - Assess test coverage (unit, integration, e2e)
   - Identify untested critical paths

3. **Documentation**
   - Check for README, docs, or comments
   - Assess code documentation quality
   - Identify missing documentation

### Phase 4: Issue Identification
1. **Potential Bugs**
   - Look for common error patterns
   - Check for race conditions or timing issues
   - Identify missing error handling

2. **Performance Concerns**
   - Find potential bottlenecks
   - Check for memory leaks or inefficient operations
   - Identify optimization opportunities

3. **Security Issues**
   - Look for exposed secrets or API keys
   - Check for SQL injection or XSS vulnerabilities
   - Review authentication implementation

## Output Format

```
## Codebase Audit Report

### Project Overview
- Type: [React, Node.js, etc.]
- Stack: [Key technologies]
- Size: [Lines of code, number of files]

### Architecture
- [Main components/modules]
- [Data flow pattern]
- [State management]

### Key Files
- Entry points: [list]
- Configuration: [list]
- Core logic: [list]

### Issues Found
- Critical: [list]
- Warnings: [list]
- Suggestions: [list]

### Recommendations
1. [Priority recommendation]
2. [Secondary recommendation]
3. [Optional improvements]
```

## Decision Points

- **Depth of analysis**: Adjust based on time constraints
- **Focus areas**: Prioritize based on current task needs
- **Documentation level**: Match to project complexity

## Common Patterns

### React Projects
- Check src/ directory structure
- Analyze component hierarchy
- Review hooks and context usage
- Check for state management (Redux, Zustand, Context)

### Node.js Projects
- Map API routes and middleware
- Check database schemas and models
- Review authentication flow
- Identify background jobs or queues

### Python Projects
- Analyze module structure
- Check virtual environment setup
- Review database migrations
- Identify CLI entry points

## Notes

- Use grep to search for specific patterns across the codebase
- Focus on high-impact areas first (core logic, API routes, data models)
- Document findings in a structured format for future reference
