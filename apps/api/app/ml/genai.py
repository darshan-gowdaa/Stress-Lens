import httpx
from app.core.config import settings

# updated to latest stable model versions
_CLAUDE_MODEL = "claude-3-5-haiku-20241022"
_GEMINI_MODEL = "gemini-2.0-flash"


def generate_weekly_summary(aggregated_stats: str) -> str:
    """Generate staff-facing weekly stress summary from topic/stat aggregates."""
    prompt = (
        "You are a student wellbeing advisor. "
        "Based on these anonymous student stress topic clusters from this week, "
        "write a concise 3-paragraph summary for university staff. "
        "Identify top concern areas, suggest actionable interventions, "
        "and flag any urgent patterns. Keep it factual and empathetic.\n\n"
        f"Data:\n{aggregated_stats}"
    )
    result = _call_with_fallback(prompt, max_tokens=600)
    if result:
        return result
    
    # Local fallback if no API keys
    try:
        import ast
        data = ast.literal_eval(aggregated_stats)
        if isinstance(data, list):
            # Sort by count descending
            data.sort(key=lambda x: int(x.get('Count', 0)), reverse=True)
            top_topics = data[:3]
            
            lines = [
                "Local Topic Extraction (Offline Mode):",
                "",
                "Based on the keyword clusters, here is a preliminary analysis of the themes driving student stress this week:",
                ""
            ]
            
            for d in top_topics:
                name = d.get('Name', d.get('Name', str(d)))
                count = d.get('Count', '')
                lines.append(f"• {str(name).upper()} ({count} submissions): Students frequently mentioned this alongside high stress or negative valence. This suggests an urgent need for department-level workload balancing.")
            
            lines.extend([
                "",
                "ACTIONABLE INTERVENTIONS:",
                "1. Academic Pacing: Coordinate with top-mentioned departments to shift assignment deadlines away from major exam weeks.",
                "2. Wellness Outreach: Deploy targeted check-ins or mindfulness nudges to students explicitly tagging burnout or exhaustion.",
                "3. Curriculum Review: Review lab and submission schedules for the highest-density topics to prevent compounding pressure.",
                "",
                "Note: Add an Anthropic or Google API key to generate contextual AI summaries from actual student text rather than keyword heuristics."
            ])
            return "\n".join(lines)
    except:
        pass
    return f"Local Topic Extraction (Offline Mode):\n\n{aggregated_stats}\n\nNote: Add an API key to enable full AI summarization."


def generate_checkin_nudge(stress_level: int, tags: list[str], category: str) -> str:
    """Generate a brief, encouraging AI nudge shown to student after submission.

    Uses only anonymized metadata (stress level + tags), never the raw text.
    Returns empty string if no API key — UI handles this gracefully.
    """
    tag_str = ", ".join(tags) if tags else "none"
    prompt = (
        "You are a compassionate student wellbeing assistant. "
        f"A student just checked in with stress level {stress_level}/10 "
        f"(ML category: {category}), mood tags: {tag_str}. "
        "Write 2 short, warm sentences: first acknowledge their feeling, "
        "then suggest one specific, practical coping action relevant to their tags. "
        "Do not be generic. Do not mention the AI or data. No disclaimers."
    )
    return _call_with_fallback(prompt, max_tokens=120) or ""


def generate_dept_insight(dept_avg_stress: float, dept_count: int, top_tags: list[str]) -> str:
    """Generate a one-sentence actionable insight for a department's stress data."""
    tag_str = ", ".join(top_tags[:5]) if top_tags else "no tags"
    prompt = (
        f"Department data: avg stress {dept_avg_stress:.1f}/10, "
        f"{dept_count} submissions, common mood tags: {tag_str}. "
        "Write exactly one sentence recommending a specific staff action. "
        "Be concrete. No hedging."
    )
    return _call_with_fallback(prompt, max_tokens=80) or ""


def _call_with_fallback(prompt: str, max_tokens: int = 300) -> str:
    """Try Claude first, fall back to Gemini, return empty string if both fail."""
    if settings.CLAUDE_API_KEY:
        result = _call_claude(prompt, max_tokens)
        if result:
            return result
    if settings.GOOGLE_API_KEY:
        result = _call_gemini(prompt, max_tokens)
        if result:
            return result
    return ""


def _call_claude(prompt: str, max_tokens: int) -> str | None:
    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.CLAUDE_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": _CLAUDE_MODEL,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        if resp.status_code == 200:
            return resp.json()["content"][0]["text"].strip()
    except Exception:
        pass
    return None


def _call_gemini(prompt: str, max_tokens: int) -> str | None:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        model = genai.GenerativeModel(
            _GEMINI_MODEL,
            generation_config={"max_output_tokens": max_tokens},
        )
        resp = model.generate_content(prompt)
        return resp.text.strip()
    except Exception:
        pass
    return None
