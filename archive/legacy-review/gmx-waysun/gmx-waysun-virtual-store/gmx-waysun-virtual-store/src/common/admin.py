from django.contrib import admin


class ReadOnlyMixing(object):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class CommonAdminMixing:
    def get_fields(self, request, obj=None):
        fields = list(["object_id"])
        fields.extend(super().get_fields(request, obj))
        fields.extend(
            (
                "created_at",
                "updated_at",
                "is_deleted",
            )
        )
        return list(dict.fromkeys(fields))

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.is_deleted:
            return self.get_fields(request, obj=obj)
        fields = list(["object_id"])
        fields.extend(super().get_readonly_fields(request, obj))
        fields.extend(("created_at", "updated_at", "is_deleted"))
        return fields

    def has_change_permission(self, request, obj=None):
        if obj:
            return not obj.is_deleted
        return super().has_change_permission(request, obj=obj)


class CommonModeInlineMixing(CommonAdminMixing):
    extra = 0
    show_change_link = True

    def get_ordering(self, request):
        return list(super().get_ordering(request)) + ["is_deleted"]

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False  # super().has_change_permission(request, obj=obj) and True


class CommonModeStackedAdmin(CommonModeInlineMixing, admin.StackedInline):
    pass


class CommonModelTabularAdmin(CommonModeInlineMixing, admin.TabularInline):
    pass


class CommonModelAdmin(CommonAdminMixing, admin.ModelAdmin):
    view_on_site = False

    def has_change_permission(self, request, obj=None):
        if obj and getattr(obj, "is_verified", False):
            return False
        return super().has_change_permission(request, obj=obj)

    def _get_sub(self, obj):
        if hasattr(obj, "sub"):
            return obj.sub
        if hasattr(obj, "object_id"):
            return obj.object_id
        if hasattr(obj, "id"):
            return obj.id
        return obj

    _get_sub.short_description = "Sub"

    def get_list_display(self, request):
        fields = list(["object_id", "_get_sub"])
        fields.extend(super().get_list_display(request))
        fields.extend(
            (
                "created_at",
                "updated_at",
                "is_deleted",
            )
        )
        return list(dict.fromkeys(fields))

    def get_list_filter(self, request):
        fields = list()
        fields.extend(super().get_list_filter(request))
        fields.extend(
            (
                "is_deleted",
                "created_at",
                "updated_at",
            )
        )
        return list(dict.fromkeys(fields))

    def get_search_fields(self, request):
        fields = list(["object_id"])
        fields.extend(super().get_list_display(request))
        return list(dict.fromkeys(fields))

    def get_list_display_links(self, request, list_display):
        fields = list(["object_id"])
        fields.extend(super().get_list_display_links(request, list_display))
        return list(dict.fromkeys(fields))
