import Capacitor
import StoreKit

// The App Store for the game (StoreKit 2, iOS 15): the animal packs, in-app purchases bought once (non-consumable).
// The game calls it as Capacitor.nativePromise('Store', method, options) (see store in game.js); every answer is the
// App Store's, nothing kept here: which packs are the player's comes from the App Store at each start
// (Transaction.currentEntitlements: a reinstall, another device, Family Sharing, a refund, all as the App Store says).
@objc(StorePlugin)
public class StorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StorePlugin"
    public let jsName = "Store"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "owned", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "buy", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
    ]
    private var updates: Task<Void, Never>?

    // purchases finished elsewhere (a grown-up saying yes to Ask to Buy, one on another device): finished here; the
    // game asks owned again when it comes back to the front
    override public func load() {
        updates = Task.detached {
            for await result in Transaction.updates {
                if case .verified(let transaction) = result { await transaction.finish() }
            }
        }
    }

    deinit { updates?.cancel() }

    // { ids } → { products: [{ id, price }] }: the price as the App Store writes it, in the player's money ("2,99 €")
    @objc func products(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        Task {
            do {
                let found = try await Product.products(for: ids)
                call.resolve(["products": found.map { ["id": $0.id, "price": $0.displayPrice] }])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    // → { ids }: the packs this Apple ID owns
    @objc func owned(_ call: CAPPluginCall) {
        Task { call.resolve(["ids": await Self.entitled()]) }
    }

    // { id } → { result }: bought, pending (Ask to Buy: a grown-up still to say yes), cancelled, failed, unavailable
    // (no such product: the App Store not reached, or the product not set up)
    @objc func buy(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { return call.reject("no product id") }
        Task {
            do {
                guard let product = try await Product.products(for: [id]).first else { return call.resolve(["result": "unavailable"]) }
                switch try await product.purchase() {
                case .success(.verified(let transaction)):
                    await transaction.finish()
                    call.resolve(["result": "bought"])
                case .pending: call.resolve(["result": "pending"])
                case .userCancelled: call.resolve(["result": "cancelled"])
                default: call.resolve(["result": "failed"])
                }
            } catch {
                call.resolve(["result": "failed"])
            }
        }
    }

    // → { ids, failed? }: the App Store asked again for this Apple ID's purchases (it may ask to sign in), then owned
    @objc func restore(_ call: CAPPluginCall) {
        Task {
            var failed = false
            do { try await AppStore.sync() } catch { failed = true }
            call.resolve(["ids": await Self.entitled(), "failed": failed])
        }
    }

    private static func entitled() async -> [String] {
        var ids: [String] = []
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.revocationDate == nil { ids.append(transaction.productID) }
        }
        return ids
    }
}
