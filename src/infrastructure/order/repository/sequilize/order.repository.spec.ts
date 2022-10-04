import { Sequelize } from "sequelize-typescript";
import Order from "../../../../domain/checkout/entity/order";
import OrderItem from "../../../../domain/checkout/entity/order_item";
import Customer from "../../../../domain/customer/entity/customer";
import Address from "../../../../domain/customer/value-object/address";
import Product from "../../../../domain/product/entity/product";
import CustomerModel from "../../../customer/repository/sequelize/customer.model";
import CustomerRepository from "../../../customer/repository/sequelize/customer.repository";
import ProductModel from "../../../product/repository/sequelize/product.model";
import ProductRepository from "../../../product/repository/sequelize/product.repository";
import OrderItemModel from "./order-item.model";
import OrderModel from "./order.model";
import OrderRepository from "./order.repository";

describe("Order repository test", () => {
  let sequelize: Sequelize;
  let customer: Customer;
  let product: Product;
  let orderItem: OrderItem;

  beforeEach(async () => {
    sequelize = new Sequelize({
      dialect: "sqlite",
      storage: ":memory:",
      logging: false,
      sync: { force: true },
    });

    await sequelize.addModels([
      CustomerModel,
      OrderModel,
      OrderItemModel,
      ProductModel,
    ]);
    await sequelize.sync();
  });

  beforeEach(async () => {
    customer = new Customer("1", "Customer 1");
    customer.changeAddress(new Address("Street 1", 1, "Zipcode 1", "City 1"));
    const customerRepository = new CustomerRepository();
    await customerRepository.create(customer);
  })

  beforeEach(async () => {
    product = new Product("2", "Product 1", 10);
    const productRepository = new ProductRepository();
    await productRepository.create(product);
  })

  beforeEach(() => {
    orderItem = new OrderItem("3", product.name, product.price, product.id, 2);
  })

  afterEach(async () => {
    await sequelize.close();
  });

  it("should create a new order", async () => {
    const order = new Order("123", customer.id, [orderItem]);

    const orderRepository = new OrderRepository();
    await orderRepository.create(order);

    const orderModel = await OrderModel.findOne({
      where: { id: order.id },
      include: ["items"],
    });

    expect(orderModel.toJSON()).toStrictEqual({
      id: order.id,
      customer_id: customer.id,
      total: order.total(),
      items: [
        {
          id: orderItem.id,
          name: orderItem.name,
          price: orderItem.price,
          quantity: orderItem.quantity,
          order_id: order.id,
          product_id: product.id,
        },
      ],
    });
  });

  it("should update a order", async () => {
    const orderRepository = new OrderRepository();
    const order = new Order("123", customer.id, [orderItem]);

    await orderRepository.create(order);

    expect( () => {
      orderRepository.update(order);
    }).toThrowError("Order can't be updated");
  });

  it("should find a order", async () => {
    const orderRepository = new OrderRepository();
    const order = new Order("123", customer.id, [orderItem]);

    await orderRepository.create(order);

    const orderModel = await OrderModel.findOne({ where: { id: order.id }, include: ["items"]});
    const foundOrder = await orderRepository.find(order.id);

    expect(orderModel.toJSON()).toStrictEqual({
      id: foundOrder.id,
      customer_id: foundOrder.customerId,
      total: foundOrder.total(),
      items: [
        {
          id: foundOrder.items[0].id,
          name: foundOrder.items[0].name,
          price: foundOrder.items[0].price,
          quantity: foundOrder.items[0].quantity,
          order_id: foundOrder.id,
          product_id: product.id,
        },
      ],
    });
  });

  it("should find all orders", async () => {
    const orderRepository = new OrderRepository();

    const order = new Order("123", customer.id, [orderItem]);
    await orderRepository.create(order);

    const customer2 = new Customer("2", "Customer 1");
    customer2.changeAddress(new Address("Street 1", 1, "Zipcode 1", "City 1"));
    const customerRepository = new CustomerRepository();
    await customerRepository.create(customer2);

    const product2 = new Product("3", "Product 1", 10);
    const productRepository = new ProductRepository();
    await productRepository.create(product2);

    const orderItem2 = new OrderItem("4", product2.name, product2.price, product2.id, 3);

    const order2 = new Order("456", customer2.id, [orderItem2]);
    await orderRepository.create(order2);

    const foundOrders = await orderRepository.findAll();
    const orders = [order, order2];

    expect(orders).toEqual(foundOrders);
  });
});
