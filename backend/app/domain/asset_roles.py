"""Asset role normalization."""
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.adapters.image.base import GeneratedBinary


def normalize_generated_assets(
    files: list[GeneratedBinary],
    role: str,
    provider: str,
    source_prompt: str,
) -> list[GeneratedBinary]:
    """
    Normalize generated assets with metadata.

    Args:
        files: List of generated binary files
        role: Asset role (e.g., "background", "icon")
        provider: Provider name (e.g., "openai", "dashscope")
        source_prompt: Original prompt used for generation

    Returns:
        List of files with normalized metadata
    """
    for file in files:
        file.metadata.update({
            "asset_role": role,
            "provider": provider,
            "source_prompt": source_prompt,
        })
    return files
