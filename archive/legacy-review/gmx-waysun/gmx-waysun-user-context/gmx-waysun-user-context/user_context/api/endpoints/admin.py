import logging
from uuid import uuid4

from fastapi import APIRouter, Depends
from fastapi.responses import ORJSONResponse
from sqlalchemy.orm import Session
from starlette.status import HTTP_404_NOT_FOUND

from user_context import errors
from user_context.api.tools.tools import get_or_create_user
from user_context.crud.partner import crud_partner
from user_context.crud.user import crud_user
from user_context.crud.user_context import crud_user_context
from user_context.models.user_context import UserModel
from user_context.schemas.common import ErrorResponseSchema, StatusEnum, SuccessResponseSchema, TokenData
from user_context.schemas.user_context import (
    UserContextCreateSchema,
    UserContextRequest,
    UserContextResponse,
    UserContextUpdateSchema,
)
from user_context.services.auth_service import OidcTokenScope
from user_context.services.database_service import DatabaseService

logger = logging.getLogger(__name__)

router = APIRouter()


class EndpointsNameEnum:
    ADMIN_USER_CONTEXT_PUT = "admin::user::context::put"
    ADMIN_USER_CONTEXT_PATCH = "admin::user::context::patch"
    ADMIN_USER_CONTEXT_DELETE = "admin::user::context::delete"
    ADMIN_USER_CONTEXT_GET = "admin::user::context::get"


@router.put(
    "/{user_sub}",
    description="Put/Create user context data",
    name=EndpointsNameEnum.ADMIN_USER_CONTEXT_PUT,
    response_model=SuccessResponseSchema,
)
async def put_or_create_user_context_by_admin(
    payload: UserContextRequest,
    token_data: TokenData = Depends(OidcTokenScope(["user_context:admin:context:write"])),
    user_model: UserModel = Depends(get_or_create_user),
    db_session: Session = Depends(DatabaseService.get_db),
):
    partner_sub = token_data.audience_sub
    partner = crud_partner.get_by_sub(db_session=db_session, sub=partner_sub)

    if partner is None:
        logger.error(f"Wrong Partner: {token_data.audience_sub}")
        return ORJSONResponse(
            status_code=HTTP_404_NOT_FOUND,
            content=ErrorResponseSchema(details=errors.ERROR_PARTNER_NOT_FOUND).dict(),
        )

    cleared_payload = {k: v for k, v in payload.context.items() if v}

    user_context = crud_user_context.get_by_user_sub_and_partner_sub(
        db_session=db_session, user_sub=user_model.sub, partner_sub=partner_sub
    )

    if user_context is None:
        user_context_data = UserContextCreateSchema(
            context_id=uuid4().hex, context=cleared_payload, user_id=user_model.id, partner_id=partner.id
        )
        user_context = crud_user_context.create(db_session=db_session, obj_in=user_context_data)
    else:
        user_context_data = UserContextUpdateSchema(
            context=cleared_payload,
        )
        user_context = crud_user_context.update(db_session=db_session, db_obj=user_context, obj_in=user_context_data)

    return SuccessResponseSchema(status=StatusEnum.OK, details=UserContextResponse(context=user_context.context))


@router.patch(
    "/{user_sub}",
    description="Update user context data",
    name=EndpointsNameEnum.ADMIN_USER_CONTEXT_PATCH,
    response_model=SuccessResponseSchema,
)
async def patch_user_context_by_admin(
    user_sub: str,
    payload: UserContextRequest,
    token_data: TokenData = Depends(OidcTokenScope(["user_context:admin:context:write"])),
    db_session: Session = Depends(DatabaseService.get_db),
):
    partner_sub = token_data.audience_sub
    partner = crud_partner.get_by_sub(db_session=db_session, sub=partner_sub)
    if partner is None:
        logger.error(f"Wrong Partner: {token_data.audience_sub}")
        return ORJSONResponse(
            status_code=HTTP_404_NOT_FOUND,
            content=ErrorResponseSchema(details=errors.ERROR_PARTNER_NOT_FOUND).dict(),
        )

    user_context = crud_user_context.get_by_user_sub_and_partner_sub(
        db_session=db_session, user_sub=user_sub, partner_sub=partner_sub
    )
    if user_context is None:
        logger.error(f"User context does not exists: {user_sub}")
        return ORJSONResponse(
            status_code=HTTP_404_NOT_FOUND,
            content=ErrorResponseSchema(details=errors.ERROR_OBJECT_NOT_FOUND).dict(),
        )
    user_context.context.update(payload.context)
    _tmp = {k: v for k, v in user_context.context.items() if v}
    user_context.context = _tmp
    crud_user_context.update_model(db_session=db_session, db_obj=user_context, auto_commit=True)

    return SuccessResponseSchema(status=StatusEnum.OK, details=UserContextResponse(context=user_context.context))


@router.delete(
    "/{user_sub}",
    description="Delete user context data",
    name=EndpointsNameEnum.ADMIN_USER_CONTEXT_DELETE,
    response_model=SuccessResponseSchema,
)
async def delete_user_context_by_admin(
    user_sub: str,
    token_data: TokenData = Depends(OidcTokenScope(["user_context:admin:context:write"])),
    db_session: Session = Depends(DatabaseService.get_db),
):
    user_model = crud_user.get_by_user_sub(db_session=db_session, user_sub=user_sub)
    if not user_model:
        logger.error(f"User not found: {user_sub}")
        return ORJSONResponse(
            status_code=HTTP_404_NOT_FOUND,
            content=ErrorResponseSchema(details=errors.ERROR_OBJECT_NOT_FOUND).dict(),
        )
    user_context = crud_user_context.get_by_user_sub_and_partner_sub(
        db_session=db_session, user_sub=user_sub, partner_sub=token_data.audience_sub
    )
    if user_context is None:
        logger.error(f"User context not found: {user_sub}")
        return ORJSONResponse(
            status_code=HTTP_404_NOT_FOUND,
            content=ErrorResponseSchema(details=errors.ERROR_OBJECT_NOT_FOUND).dict(),
        )
    user_context_data = UserContextUpdateSchema(
        context=dict(),
    )
    crud_user_context.update(db_session=db_session, db_obj=user_context, obj_in=user_context_data)

    return SuccessResponseSchema(status=StatusEnum.OK)


@router.get(
    "/{user_sub}",
    description="Get user context data",
    name=EndpointsNameEnum.ADMIN_USER_CONTEXT_GET,
    response_model=SuccessResponseSchema,
)
async def get_user_context_by_admin(
    user_sub: str,
    db_session: Session = Depends(DatabaseService.get_db),
    token_data: TokenData = Depends(OidcTokenScope(["user_context:admin:context:read"])),
):
    user_model = crud_user.get_by_user_sub(db_session=db_session, user_sub=user_sub)
    if not user_model:
        return SuccessResponseSchema(status=StatusEnum.OK, details=UserContextResponse(context={}))

    user_context = crud_user_context.get_by_user_sub_and_partner_sub(
        db_session=db_session, user_sub=user_sub, partner_sub=token_data.audience_sub
    )
    if user_context is None:
        return SuccessResponseSchema(status=StatusEnum.OK, details=UserContextResponse(context={}))

    return SuccessResponseSchema(status=StatusEnum.OK, details=UserContextResponse(context=user_context.context))
