# app/utils/notification_helpers.py
"""
Helper functions for generating proper action URLs for notifications
"""

def get_upload_success_url(file_id: str) -> str:
    """Get URL for successful file upload"""
    return f"/editing?file={file_id}"

def get_upload_failed_url() -> str:
    """Get URL for failed upload - redirect to main page"""
    return "/"

def get_export_ready_url(export_id: str, format: str = "csv") -> str:
    """Get download URL for ready export"""
    return f"/api/files/exports/{export_id}.{format}"

def get_chart_created_url(chart_id: str) -> str:
    """Get URL to view created chart"""
    return f"/editing?chart={chart_id}"

def get_forecast_complete_url(forecast_id: str) -> str:
    """Get URL to view completed forecast"""
    return f"/forecast?result={forecast_id}"

def get_processing_status_url(job_id: str) -> str:
    """Get URL to check processing status"""
    return f"/status/{job_id}"

def get_report_url(report_id: str) -> str:
    """Get URL to view generated report"""
    return f"/reports/{report_id}"

def get_settings_url(section: str = None) -> str:
    """Get URL to settings page with optional section"""
    if section:
        return f"/settings?section={section}"
    return "/settings"

def get_profile_url() -> str:
    """Get URL to user profile"""
    return "/profile"

def get_help_url(topic: str = None) -> str:
    """Get URL to help/documentation"""
    if topic:
        return f"/help?topic={topic}"
    return "/help"

# Category-specific URL generators
def generate_notification_url(category: str, context: dict) -> str:
    """
    Generate appropriate action URL based on notification category and context
    
    Args:
        category: Notification category (processing, export, upload, etc.)
        context: Dict containing relevant IDs and metadata
    
    Returns:
        Appropriate action URL
    """
    
    if category == "processing":
        if context.get("success"):
            return get_upload_success_url(context.get("file_id", ""))
        else:
            return get_processing_status_url(context.get("job_id", ""))
    
    elif category == "export":
        return get_export_ready_url(
            context.get("export_id", ""),
            context.get("format", "csv")
        )
    
    elif category == "upload":
        if context.get("success"):
            return get_upload_success_url(context.get("file_id", ""))
        else:
            return get_upload_failed_url()
    
    elif category == "chart":
        return get_chart_created_url(context.get("chart_id", ""))
    
    elif category == "forecast":
        return get_forecast_complete_url(context.get("forecast_id", ""))
    
    elif category == "report":
        return get_report_url(context.get("report_id", ""))
    
    elif category == "security":
        return get_settings_url("security")
    
    elif category == "system":
        return get_settings_url()
    
    else:
        # Default to home
        return "/"

# Enhanced notification creation with proper URLs
def create_upload_notification(db, user_id: int, filename: str, success: bool, 
                               file_id: str = None, error: str = None):
    """Create notification for file upload with proper action URL"""
    from app.routers.notifications import create_notification_for_user, NotificationType, NotificationCategory, NotificationPriority
    
    if success:
        return create_notification_for_user(
            db=db,
            user_id=user_id,
            title="File Upload Successful",
            message=f"'{filename}' has been uploaded and is ready for visualization.",
            type=NotificationType.SUCCESS,
            category=NotificationCategory.UPLOAD,
            priority=NotificationPriority.MEDIUM,
            action_url=get_upload_success_url(file_id) if file_id else None,
            metadata={"filename": filename, "file_id": file_id}
        )
    else:
        return create_notification_for_user(
            db=db,
            user_id=user_id,
            title="File Upload Failed",
            message=f"Failed to upload '{filename}': {error or 'Unknown error'}",
            type=NotificationType.ERROR,
            category=NotificationCategory.UPLOAD,
            priority=NotificationPriority.HIGH,
            action_url=get_upload_failed_url(),
            metadata={"filename": filename, "error": error}
        )

def create_export_notification(db, user_id: int, export_type: str, 
                               record_count: int, export_id: str, format: str = "csv"):
    """Create notification for completed export with download URL"""
    from app.routers.notifications import create_notification_for_user, NotificationType, NotificationCategory, NotificationPriority
    
    return create_notification_for_user(
        db=db,
        user_id=user_id,
        title="Export Ready",
        message=f"Your {export_type} export containing {record_count:,} records is ready for download.",
        type=NotificationType.SUCCESS,
        category=NotificationCategory.EXPORT,
        priority=NotificationPriority.MEDIUM,
        action_url=get_export_ready_url(export_id, format),
        metadata={
            "export_type": export_type,
            "record_count": record_count,
            "export_id": export_id,
            "format": format
        }
    )

def create_forecast_notification(db, user_id: int, forecast_name: str,
                                 accuracy: float, forecast_id: str):
    """Create notification for completed AI forecast"""
    from app.routers.notifications import create_notification_for_user, NotificationType, NotificationCategory, NotificationPriority
    
    return create_notification_for_user(
        db=db,
        user_id=user_id,
        title="AI Forecast Complete",
        message=f"Your forecast '{forecast_name}' has been generated with {accuracy:.1%} accuracy. View your predictions now.",
        type=NotificationType.SUCCESS,
        category=NotificationCategory.FORECAST,
        priority=NotificationPriority.HIGH,
        action_url=get_forecast_complete_url(forecast_id),
        metadata={
            "forecast_name": forecast_name,
            "accuracy": accuracy,
            "forecast_id": forecast_id
        }
    )

def create_processing_notification(db, user_id: int, filename: str, 
                                   success: bool, job_id: str = None, 
                                   file_id: str = None, error: str = None):
    """Create notification for data processing completion/failure"""
    from app.routers.notifications import create_notification_for_user, NotificationType, NotificationCategory, NotificationPriority
    
    if success:
        return create_notification_for_user(
            db=db,
            user_id=user_id,
            title="Processing Complete",
            message=f"'{filename}' has been processed successfully and is ready for analysis.",
            type=NotificationType.SUCCESS,
            category=NotificationCategory.PROCESSING,
            priority=NotificationPriority.MEDIUM,
            action_url=get_upload_success_url(file_id) if file_id else None,
            metadata={"filename": filename, "file_id": file_id}
        )
    else:
        return create_notification_for_user(
            db=db,
            user_id=user_id,
            title="Processing Failed",
            message=f"Failed to process '{filename}': {error or 'Unknown error'}. Please try again.",
            type=NotificationType.ERROR,
            category=NotificationCategory.PROCESSING,
            priority=NotificationPriority.HIGH,
            action_url=get_processing_status_url(job_id) if job_id else None,
            metadata={"filename": filename, "error": error, "job_id": job_id}
        )
