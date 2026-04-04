from dataclasses import dataclass


@dataclass(frozen=True)
class OrderLinesValues:
    uid: str = "uid"
    base_product: str = "base_product"
    quantity: str = "quantity"
    price: str = "price"
    created_at: str = "created_at"
    base_product__bonus_single__sbtech_bonus_id: str = "base_product__bonus_single__sbtech_bonus_id"
    base_product__bonus_multiple__uid: str = "base_product__bonus_multiple__uid"
    base_product__bonus_value: str = "base_product__bonus_value"
    base_product__bonus_type: str = "base_product__bonus_type"
    base_product__notification_type: str = "base_product__notification_type"
    base_product__credit_all_points: str = "base_product__credit_all_points"
    base_product__product__product_type__partner_configuration__name: str = (
        "base_product__product__product_type__partner_configuration__name"
    )
    base_product__package__package_product__product_type__partner_configuration__name: str = (
        "base_product__package__package_product__product_type__partner_configuration__name"
    )
