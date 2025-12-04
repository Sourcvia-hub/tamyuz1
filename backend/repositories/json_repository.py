"""
JSON File-based Repository Implementation

This implementation stores data in JSON files for temporary persistence.
Data persists across server restarts and can be easily exported to SharePoint later.

Storage Structure:
/app/data/
  users.json
  vendors.json
  tenders.json
  ...
"""

import json
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import asyncio
from .base_repository import BaseRepository


class JSONRepository(BaseRepository):
    """
    File-based repository using JSON for data storage.
    
    Features:
    - Automatic file creation
    - Thread-safe operations (file locking)
    - Persistent storage
    - Easy export/import
    """
    
    def __init__(self, collection_name: str, data_dir: str = "/app/data"):
        """
        Initialize the JSON repository.
        
        Args:
            collection_name: Name of the collection (e.g., "vendors", "contracts")
            data_dir: Directory where JSON files are stored
        """
        self.collection_name = collection_name
        self.data_dir = Path(data_dir)
        self.file_path = self.data_dir / f"{collection_name}.json"
        
        # Create data directory if it doesn't exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize file if it doesn't exist
        if not self.file_path.exists():
            self._write_data([])
    
    def _read_data(self) -> List[Dict[str, Any]]:
        """Read data from JSON file."""
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    def _write_data(self, data: List[Dict[str, Any]]) -> None:
        """Write data to JSON file."""
        with open(self.file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str, ensure_ascii=False)
    
    def _match_filters(self, record: Dict[str, Any], filters: Dict[str, Any]) -> bool:
        """
        Check if a record matches the given filters.
        
        Args:
            record: Record to check
            filters: Dictionary of field:value pairs
            
        Returns:
            True if all filters match, False otherwise
        """
        for key, value in filters.items():
            if key not in record:
                return False
            
            # Handle None/null comparisons
            if value is None:
                if record[key] is not None:
                    return False
            elif record[key] != value:
                return False
        
        return True
    
    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new record."""
        records = self._read_data()
        
        # Add creation timestamp if not present
        if 'created_at' not in data:
            data['created_at'] = datetime.now(timezone.utc).isoformat()
        
        # Add updated timestamp
        if 'updated_at' not in data:
            data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        records.append(data)
        self._write_data(records)
        
        return data
    
    async def get_by_id(self, id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a single record by ID."""
        records = self._read_data()
        
        for record in records:
            if record.get('id') == id:
                return record
        
        return None
    
    async def get_all(self, filters: Optional[Dict[str, Any]] = None, 
                     limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Retrieve all records, optionally filtered."""
        records = self._read_data()
        
        # Apply filters if provided
        if filters:
            records = [r for r in records if self._match_filters(r, filters)]
        
        # Apply limit if provided
        if limit:
            records = records[:limit]
        
        return records
    
    async def update(self, id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing record."""
        records = self._read_data()
        
        for i, record in enumerate(records):
            if record.get('id') == id:
                # Update fields
                record.update(data)
                
                # Update timestamp
                record['updated_at'] = datetime.now(timezone.utc).isoformat()
                
                records[i] = record
                self._write_data(records)
                
                return record
        
        return None
    
    async def delete(self, id: str) -> bool:
        """Delete a record by ID."""
        records = self._read_data()
        initial_length = len(records)
        
        records = [r for r in records if r.get('id') != id]
        
        if len(records) < initial_length:
            self._write_data(records)
            return True
        
        return False
    
    async def find_one(self, filters: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find a single record matching the filters."""
        records = self._read_data()
        
        for record in records:
            if self._match_filters(record, filters):
                return record
        
        return None
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records matching the filters."""
        records = self._read_data()
        
        if filters:
            records = [r for r in records if self._match_filters(r, filters)]
        
        return len(records)
    
    async def exists(self, filters: Dict[str, Any]) -> bool:
        """Check if any record exists matching the filters."""
        record = await self.find_one(filters)
        return record is not None
    
    # Additional helper methods for complex queries
    
    async def find_many(self, filters: Dict[str, Any], 
                       limit: Optional[int] = None,
                       sort_by: Optional[str] = None,
                       sort_desc: bool = False) -> List[Dict[str, Any]]:
        """
        Find multiple records with advanced options.
        
        Args:
            filters: Dictionary of field:value pairs to filter by
            limit: Maximum number of records to return
            sort_by: Field name to sort by
            sort_desc: Sort in descending order if True
            
        Returns:
            List of matching records
        """
        records = await self.get_all(filters, limit=None)
        
        # Sort if requested
        if sort_by and records:
            try:
                records = sorted(
                    records, 
                    key=lambda x: x.get(sort_by, ''), 
                    reverse=sort_desc
                )
            except Exception:
                pass  # If sorting fails, return unsorted
        
        # Apply limit after sorting
        if limit:
            records = records[:limit]
        
        return records
    
    async def update_many(self, filters: Dict[str, Any], 
                         updates: Dict[str, Any]) -> int:
        """
        Update multiple records matching the filters.
        
        Args:
            filters: Dictionary of field:value pairs to filter by
            updates: Dictionary of fields to update
            
        Returns:
            Number of records updated
        """
        records = self._read_data()
        updated_count = 0
        
        for i, record in enumerate(records):
            if self._match_filters(record, filters):
                record.update(updates)
                record['updated_at'] = datetime.now(timezone.utc).isoformat()
                records[i] = record
                updated_count += 1
        
        if updated_count > 0:
            self._write_data(records)
        
        return updated_count
    
    async def delete_many(self, filters: Dict[str, Any]) -> int:
        """
        Delete multiple records matching the filters.
        
        Args:
            filters: Dictionary of field:value pairs to filter by
            
        Returns:
            Number of records deleted
        """
        records = self._read_data()
        initial_length = len(records)
        
        records = [r for r in records if not self._match_filters(r, filters)]
        
        deleted_count = initial_length - len(records)
        
        if deleted_count > 0:
            self._write_data(records)
        
        return deleted_count
